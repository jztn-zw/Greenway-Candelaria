const { emitResidentDataChanged } = require("../sockets/residentChanges.socket");
const { emitAdminDataChanged } = require("../sockets/adminChanges.socket");

// Successful HTTP writes are the common boundary for changes from any web role.
// Jobs that change records without HTTP publish explicitly after saving.
const changedDomains = (req) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return [];
  const path = req.originalUrl.split("?")[0].replace(/\/+$/, "");
  const [, module, ...segments] = path.replace(/^\/api\//, "/").split("/");
  const action = segments.join("/");
  switch (module) {
    case "reports": return action === "upload-photos" ? [] : ["reports", "residents"];
    case "posts": return action === "upload-image" ? [] : ["posts"];
    case "announcements": return ["announcements", "schedule"];
    case "routes": return ["routes", "tracking", "drivers", "trucks", "schedule"];
    case "barangays": return ["barangays", "routes", "tracking", "schedule", "residents"];
    case "drivers":
      if (segments.includes("messages")) return ["tracking"];
      return ["drivers", "trucks", "routes", "tracking"];
    case "trucks": return ["drivers", "trucks", "routes", "tracking"];
    case "schedule": return ["schedule"];
    case "tracking": return req.method === "DELETE" ? ["tracking"] : []; // GPS has its own live feed.
    case "users":
      if (["settings", "admin-settings", "change-password"].includes(action)) return [];
      return ["residents", "drivers", "trucks", "reports", "routes", "tracking"];
    case "auth": return action === "register" ? ["residents"] : [];
    default: return [];
  }
};

const createAdminChangesMiddleware = (emit = emitAdminDataChanged) => (req, res, next) => {
  // req.user is populated by the route's authentication middleware by finish.
  res.once("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 300 || req.user?.role !== "RESIDENT") return;
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return;
    const path = req.originalUrl.split("?")[0];
    if (path === "/api/users/settings") emitResidentDataChanged(["settings"], req.user.id);
    if (path === "/api/users/profile") emitResidentDataChanged(["profile"], req.user.id);
    if (path.startsWith("/api/notifications")) emitResidentDataChanged(["notifications"], req.user.id);
  });
  // Web conversation writes change messaging only. Do not refresh resident,
  // dashboard, analytics, or assignment data for a chat message.
  if (req.method === "POST" && /^\/api\/drivers\/(?:me|[^/]+)\/messages\/conversation(?:\?|$)/.test(req.originalUrl)) {
    res.once("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) emit(["tracking"], { residents: false, collectors: false });
    });
    return next();
  }
  const domains = changedDomains(req);
  if (domains.length) res.once("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) emit([...domains, "dashboard", "analytics"], { residents: !/\/announcements\/[^/]+\/read(?:\?|$)/.test(req.originalUrl) });
  });
  next();
};
module.exports = { adminChanges: createAdminChangesMiddleware(), changedDomains, createAdminChangesMiddleware };
