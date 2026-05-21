/* Service worker — Web Push (Yo Te Invito). Sin lógica de negocio. */

self.addEventListener('push', (event) => {
  let data = {
    title: 'Yo Te Invito',
    body: 'Tenés una nueva notificación.',
    url: '/me/notifications',
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        data = { ...data, ...parsed };
      }
    }
  } catch {
    const text = event.data?.text?.();
    if (text) data.body = text;
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: data.url || '/me/notifications' },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/me/notifications';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }),
  );
});
