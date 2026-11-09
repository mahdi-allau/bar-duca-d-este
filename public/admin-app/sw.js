/* Notifications for the admin app (Web Push). It only shows notifications: it caches nothing. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Duca d'Este";
  const work = [
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/admin-app/icon-192.png",
      tag: data.tag || undefined,
      data: { url: data.url || "/admin" },
    }),
  ];
  // the number on the app icon (where the phone supports it)
  if (typeof data.badge === "number" && self.navigator) {
    if (data.badge > 0 && self.navigator.setAppBadge) work.push(self.navigator.setAppBadge(data.badge).catch(() => {}));
    if (data.badge === 0 && self.navigator.clearAppBadge) work.push(self.navigator.clearAppBadge().catch(() => {}));
  }
  event.waitUntil(Promise.all(work));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/admin", self.location.origin);
  // only ever open pages of the admin area
  const url = target.origin === self.location.origin && target.pathname.startsWith("/admin") ? target.href : self.location.origin + "/admin";
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of open) {
        if (new URL(client.url).pathname.startsWith("/admin") && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
