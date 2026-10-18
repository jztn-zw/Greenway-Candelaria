// Display/click support for alerts received by an open Resident page.
// This worker does not cache responses or subscribe to background Web Push.
self.addEventListener("install", event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const destination = new URL("/resident/notifications", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const resident = windows.find(client => client.url === `${self.location.origin}/resident`
      || client.url.startsWith(`${self.location.origin}/resident/`));
    if (resident) { await resident.navigate(destination); await resident.focus(); }
    else await self.clients.openWindow(destination);
  })());
});
