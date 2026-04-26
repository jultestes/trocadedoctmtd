/* Custom Service Worker — Web Push + PWA
 * Importante: este arquivo é a fonte para o build (injectManifest).
 */

// Placeholder para o vite-plugin-pwa injetar a precache list (necessário no injectManifest).
// Não remover.
self.__WB_MANIFEST;

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
    if (event.data) {
      const txt = event.data.text();
      try {
        data = JSON.parse(txt);
      } catch {
        data = { title: "Nova venda recebida!", body: txt };
      }
    }
  } catch (e) {
    data = { title: "Nova venda recebida!", body: "Um novo pedido entrou." };
  }

  const title = data.title || "Nova venda recebida!";
  const options = {
    body: data.body || "Um novo pedido acabou de entrar no site.",
    icon: data.icon || "/pwa-icon-192.png",
    badge: data.badge || "/pwa-icon-192.png",
    tag: data.tag || "new-sale",
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url: data.url || "/admin" },
  };

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .catch((err) => console.error("[SW] showNotification error:", err))
  );
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
