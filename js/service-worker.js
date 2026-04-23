const CACHE_NAME = "pastimez-v1";
const APP_SHELL = [
  "/pastimez/",
  "/pastimez/index.html",
  "/pastimez/css/style.css",
  "/pastimez/js/main.js",
  "/pastimez/404.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});