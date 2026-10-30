const CACHE_NAME = 'edu-platform-v1';

// تثبيت الـ Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting(); // تفعيل النسخة الجديدة فوراً
});

// تفعيل الـ Service Worker ومسح الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // السيطرة على الصفحات المفتوحة
  );
});

// استراتيجية الجلب: Network First (نجيب من النت الأول، لو مفيش نستخدم الكاش)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
