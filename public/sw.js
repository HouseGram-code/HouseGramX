/* Service Worker для фоновых Web Push уведомлений HouseGramX. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "HouseGramX", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "HouseGramX";
  const options = {
    body: data.body || "Новое сообщение",
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || undefined,
    data: { url: data.url || "/chats" },
    vibrate: [60, 40, 60],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/chats";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Если вкладка приложения уже открыта — фокусируем и переходим.
        for (const client of clients) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              try {
                client.navigate(url);
              } catch {
                /* ignore */
              }
            }
            return;
          }
        }
        // Иначе открываем новую вкладку.
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
