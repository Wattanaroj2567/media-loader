/* Service worker for standards-based Web Push notifications. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title =
    typeof payload.title === "string" ? payload.title : "Media Loader";
  const body =
    typeof payload.body === "string"
      ? payload.body
      : "A download job has finished.";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        if (clients.some((client) => client.visibilityState === "visible")) return;
        return self.registration.showNotification(title, {
          body,
          tag: typeof payload.tag === "string" ? payload.tag : undefined,
          icon: "/icon.png",
          badge: "/apple-icon.png",
          data: { url: "/dashboard" },
        });
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      async (clients) => {
        const target = new URL("/dashboard", self.location.origin);
        const existing = clients.find((client) => client.url.startsWith(self.location.origin));
        if (existing) {
          await existing.navigate(target.href);
          return existing.focus();
        }
        return self.clients.openWindow(target.href);
      }
    )
  );
});
