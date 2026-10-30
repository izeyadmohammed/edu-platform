const CACHE_NAME = 'edu-platform-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// استراتيجية Network First: نجيب من الشبكة دايماً، لو فشل نروح للكاش
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).then(response => {
      // تحديث الكاش بالنسخة الجديدة
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
      return response;
    }).catch(() => caches.match(event.request))
  );
});
