const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("../../client/node_modules/typescript");
let sequence = 0;
const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../../client/src/lib/authStorage.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), values };
}
function tab(localStorage, sessionStorage = storage()) {
  const module = { exports: {} };
  vm.runInNewContext(source, { exports: module.exports, module, localStorage, sessionStorage, crypto: { randomUUID: () => `browser-generation-${++sequence}` }, window: { dispatchEvent() {} }, Event });
  return { ...module.exports, localStorage, sessionStorage };
}
// Duplicate an already authenticated tab, including its private session state.
function activePeer(original) {
  const session = storage();
  for (const [key, value] of original.sessionStorage.values) session.setItem(key, value);
  return tab(original.localStorage, session);
}
const userA = { id: "account-a", role: "RESIDENT", full_name: "Account A" };
const userB = { id: "account-b", role: "ADMIN", full_name: "Account B" };

for (const remembered of [false, true]) test(`anonymous tabs do not join another tab's login (Remember Me: ${remembered})`, () => {
  const local = storage(), idle = tab(local), signingIn = tab(local);
  signingIn.saveBrowserAuthSession("a-token", userA, remembered);
  assert.equal(idle.adoptBrowserAuthSnapshot(signingIn.readBrowserAuthSnapshot()), false);
  assert.equal(idle.readRememberedBrowserSnapshot(), null);
  assert.equal(idle.getAuthStorage().getItem("token"), null);
  const reloaded = tab(local, idle.sessionStorage);
  assert.equal(reloaded.getAuthStorage().getItem("token"), null);
  const fresh = tab(local);
  assert.equal(fresh.getAuthStorage().getItem("token"), null, "a new tab must wait for its own sign-in");
  assert.equal(fresh.adoptBrowserAuthSnapshot(signingIn.readBrowserAuthSnapshot()), false);
  fresh.saveBrowserAuthSession("b-token", userB, remembered);
  assert.equal(fresh.getAuthStorage().getItem("token"), "b-token");
  assert.equal(signingIn.adoptBrowserAuthSnapshot(fresh.readBrowserAuthSnapshot()), true);
  assert.equal(signingIn.getAuthStorage().getItem("token"), "b-token");
  assert.equal(idle.adoptBrowserAuthSnapshot(fresh.readBrowserAuthSnapshot()), false);
  assert.equal(tab(local, fresh.sessionStorage).getAuthStorage().getItem("token"), "b-token", "an already signed-in tab can reload");
});

test("a temporary B login supersedes A in other tabs without persisting credentials", () => {
  const local = storage(), a = tab(local);
  local.setItem("report-draft-account-a", "keep draft");
  a.saveBrowserAuthSession("a-token", userA, false);
  const snapshotA = a.readBrowserAuthSnapshot();
  const b = activePeer(a);
  assert.equal(b.getAuthStorage().getItem("token"), "a-token");
  assert.equal(b.adoptBrowserAuthSnapshot(snapshotA), true);
  b.saveBrowserAuthSession("b-token", userB, false);
  assert.equal(a.getAuthStorage().getItem("token"), null, "A must block old-account requests until synchronized");
  assert.equal(a.adoptBrowserAuthSnapshot(snapshotA), false, "a stale peer must not restore A");
  assert.equal(a.adoptBrowserAuthSnapshot(b.readBrowserAuthSnapshot()), true);
  assert.equal(a.getAuthStorage().getItem("token"), "b-token");
  assert.equal(JSON.parse(a.getAuthStorage().getItem("user")).id, "account-b");
  assert.equal(local.getItem("token"), null);
  assert.equal(local.getItem("user"), null);
  assert.equal(local.getItem("report-draft-account-a"), "keep draft");
});

test("remembered B becomes the shared account only for already signed-in tabs", () => {
  const local = storage(), a = tab(local);
  a.saveBrowserAuthSession("a-token", userA, false);
  const b = tab(local);
  b.saveBrowserAuthSession("b-token", userB, true);
  assert.equal(a.getAuthStorage().getItem("token"), null);
  a.authStateStorage.setItem("auth-storage", "stale state");
  assert.notEqual(local.getItem("auth-storage"), "stale state");
  assert.equal(a.adoptBrowserAuthSnapshot(a.readRememberedBrowserSnapshot()), true);
  assert.equal(a.getAuthStorage().getItem("token"), "b-token");
  const newTab = tab(local);
  assert.equal(newTab.getAuthStorage().getItem("token"), null);
  assert.equal(tab(local, a.sessionStorage).getAuthStorage().getItem("token"), "b-token");
});

test("a stale tab cannot clear the browser's newer account", () => {
  const local = storage(), a = tab(local);
  a.saveBrowserAuthSession("a-token", userA, false);
  const b = tab(local);
  b.saveBrowserAuthSession("b-token", userB, true);
  const marker = local.getItem(b.BROWSER_SESSION_KEY);
  a.clearAuthStorage();
  assert.equal(local.getItem("token"), "b-token");
  assert.equal(local.getItem(b.BROWSER_SESSION_KEY), marker);
});

test("server session invalidation still invalidates temporary copies in all active tabs", () => {
  const local = storage(), a = tab(local);
  a.saveBrowserAuthSession("a-token", userA, false);
  const b = activePeer(a);
  b.adoptBrowserAuthSnapshot(a.readBrowserAuthSnapshot());
  a.clearAuthStorage();
  assert.equal(b.getAuthStorage().getItem("token"), null);
  const marker = local.getItem(b.BROWSER_SESSION_KEY);
  b.clearAuthStorage();
  assert.equal(local.getItem(b.BROWSER_SESSION_KEY), marker, "logout reconciliation must not broadcast another logout");
  a.saveBrowserAuthSession("b-token", userB, true);
  assert.equal(b.adoptBrowserAuthSnapshot(a.readBrowserAuthSnapshot()), false, "an expired tab must wait for its own sign-in");
});

for (const remembered of [false, true]) test(`signing out affects only this tab (Remember Me: ${remembered})`, () => {
  const local = storage(), a = tab(local);
  a.saveBrowserAuthSession("a-token", userA, remembered);
  const b = activePeer(a);
  b.adoptBrowserAuthSnapshot(a.readBrowserAuthSnapshot());
  const marker = local.getItem(a.BROWSER_SESSION_KEY);
  a.signOutCurrentTab();
  assert.equal(a.getAuthStorage().getItem("token"), null);
  assert.equal(a.readBrowserAuthSnapshot(), null);
  assert.equal(local.getItem(a.BROWSER_SESSION_KEY), marker);
  assert.equal(b.getAuthStorage().getItem("token"), "a-token");
  const reloaded = tab(local, a.sessionStorage);
  assert.equal(reloaded.isTabSignedOut(), true);
  assert.equal(reloaded.getAuthStorage().getItem("token"), null);
  assert.equal(reloaded.adoptBrowserAuthSnapshot(b.readBrowserAuthSnapshot()), false);
  const persisted = b.getAuthStorage().getItem("auth-storage");
  reloaded.clearAuthStorage();
  reloaded.authStateStorage.removeItem("auth-storage");
  assert.equal(b.getAuthStorage().getItem("token"), "a-token", "a signed-out route guard must not clear another tab");
  assert.equal(b.getAuthStorage().getItem("auth-storage"), persisted);
  reloaded.saveBrowserAuthSession("b-token", userB, false);
  assert.equal(reloaded.isTabSignedOut(), false);
  assert.equal(reloaded.getAuthStorage().getItem("token"), "b-token");
  assert.equal(b.adoptBrowserAuthSnapshot(reloaded.readBrowserAuthSnapshot()), true);
  assert.equal(b.getAuthStorage().getItem("token"), "b-token");
});

test("a signed-out tab ignores other account changes until explicitly signed in", () => {
  const local = storage(), a = tab(local);
  a.saveBrowserAuthSession("a-token", userA, true);
  const b = tab(local);
  a.signOutCurrentTab();
  b.saveBrowserAuthSession("b-token", userB, true);
  assert.equal(a.readRememberedBrowserSnapshot(), null);
  assert.equal(a.adoptBrowserAuthSnapshot(b.readBrowserAuthSnapshot()), false);
  assert.equal(a.getAuthStorage().getItem("token"), null);
  a.clearAuthStorage();
  assert.equal(b.getAuthStorage().getItem("token"), "b-token");
});

test("pending browser sign-ins are cleared only by their own completion", () => {
  const a = tab(storage());
  const earlier = a.beginBrowserSignIn();
  const latest = a.beginBrowserSignIn();
  a.finishBrowserSignIn(earlier);
  assert.equal(a.isBrowserSignInPending(), true);
  a.finishBrowserSignIn(latest);
  assert.equal(a.isBrowserSignInPending(), false);
});

test("a closed temporary session cannot be restored from persistent browser data", () => {
  const local = storage(), a = tab(local);
  a.saveBrowserAuthSession("a-token", userA, false);
  const reopenedBrowser = tab(local);
  assert.equal(reopenedBrowser.readBrowserAuthSnapshot(), null);
  assert.equal(reopenedBrowser.readRememberedBrowserSnapshot(), null);
  assert.equal(reopenedBrowser.getAuthStorage().getItem("token"), null);
});

test("separate browser profiles keep different accounts independently", () => {
  const a = tab(storage()), b = tab(storage());
  a.saveBrowserAuthSession("a-token", userA, true);
  b.saveBrowserAuthSession("b-token", userB, true);
  assert.equal(a.getAuthStorage().getItem("token"), "a-token");
  assert.equal(b.getAuthStorage().getItem("token"), "b-token");
});

test("legacy remembered credentials migrate without losing the login", () => {
  const local = storage();
  local.setItem("token", "legacy-token");
  local.setItem("user", JSON.stringify(userA));
  local.setItem("auth-storage", "saved-zustand-state");
  const a = tab(local);
  assert.equal(a.getAuthStorage().getItem("token"), "legacy-token");
  assert.equal(a.authStateStorage.getItem("auth-storage"), "saved-zustand-state");
  assert.equal(a.getBrowserSessionMarker().remembered, true);
});
