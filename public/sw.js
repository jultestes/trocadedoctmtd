/* Custom Service Worker — Web Push notifications.
 * Servido diretamente de /public/sw.js (não passa por bundler).
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ============ Web Push ============
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: "Venda aprovada!",
      body: "Valor: R$ 0,00",
    };
  }

  const title = data.title || "Venda aprovada!";
  const options = {
    body: data.body || "Valor: R$ 0,00",
    icon: data.icon || "/pwa-icon-192.png",
    badge: data.badge || "/pwa-icon-192.png",
    tag: data.tag || "nova-venda",
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/admin",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
