/* global clients */
// Service Worker dla Push Notifications

self.addEventListener('install', () => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(clients.claim());
});

// Obsługa push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received', event);

  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('Error parsing push data:', e);
  }

  const title = data.title || 'Nowe powiadomienie';
  const options = {
    body: data.body || '',
    icon: '/icons/android/android-launchericon-192-192.png',
    badge: '/icons/android/android-launchericon-96-96.png',
    tag: data.tag || 'notification',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Obsługa kliknięcia w powiadomienie
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const orderId = new URL(urlToOpen, self.location.origin).searchParams.get('order');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Sprawdź czy jest już otwarte okno aplikacji
        for (let client of windowClients) {
          if (client.url.startsWith(self.location.origin)) {
            client.focus();
            if (orderId) client.postMessage({ type: 'OPEN_ORDER', orderId });
            return;
          }
        }
        // Jeśli nie ma otwartego okna, otwórz nowe z URL
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
