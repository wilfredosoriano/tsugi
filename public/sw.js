/**
 * Handles incoming Web Push messages and notification taps. Registered by
 * src/lib/push.js. This runs in its own worker context, completely outside
 * the React app — no bundler, no imports from the rest of the codebase.
 */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // non-JSON payload — fall back to the defaults below
  }

  const title = data.title || 'Tsugi';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/** Focuses an already-open tab if there is one, otherwise opens a new one. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
