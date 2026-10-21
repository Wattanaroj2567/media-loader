/* Service worker for standards-based Web Push notifications. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function sameOriginNotificationUrl(value, fallback = "/dashboard") {
  try {
    const target = new URL(value, self.location.origin);
    return target.origin === self.location.origin ? target.href : fallback;
  } catch {
    return fallback;
  }
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === "string" ? payload.title : "Media Loader";
  const body =
    typeof payload.body === "string" ? payload.body : "A download job has finished.";
  const requestedUrl = typeof payload.url === "string" ? payload.url : "/dashboard";
  const notificationUrl = sameOriginNotificationUrl(requestedUrl);

  event.waitUntil(
    self.registration.pushManager
      .getSubscription()
      .then((subscription) => {
        if (!subscription) return;
        return self.clients
          .matchAll({ type: "window", includeUncontrolled: true })
          .then((clients) => {
            if (clients.some((client) => client.visibilityState === "visible")) return;
            return self.registration.showNotification(title, {
              body,
              tag: typeof payload.tag === "string" ? payload.tag : undefined,
              icon: "/icon.png",
              badge: "/apple-icon.png",
              data: { url: notificationUrl },
            });
          });
      })
      .catch(() => {
        // Fail closed if the browser can no longer confirm this subscription.
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        const requestedUrl = event.notification.data?.url;
        const target = new URL(
          sameOriginNotificationUrl(
            typeof requestedUrl === "string" ? requestedUrl : "/dashboard"
          )
        );
        const existing = clients.find((client) => {
          try {
            return new URL(client.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });
        if (existing) {
          await existing.navigate(target.href);
          return existing.focus();
        }
        return self.clients.openWindow(target.href);
      })
  );
});
