const CACHE_NAME = 'netoptima-v1';
const OFFLINE_URL = '/';

const PRECACHE_URLS = [
  '/',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Cache-first for static assets
  if (url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }
  
  // Network-first for HTML pages
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html' } })))
  );
});

const OFFLINE_HTML = `<!DOCTYPE html><html><head><title>NetOptima - Offline</title><style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f8fafc;color:#1e293b;text-align:center}.box{padding:2rem}h1{font-size:1.5rem}p{color:#64748b;margin-top:1rem}button{margin-top:1rem;padding:0.5rem 1.5rem;background:#0f172a;color:#fff;border:none;border-radius:0.5rem;cursor:pointer}</style></head><body><div class="box"><h1>📡 NetOptima Algérie</h1><p>You are currently offline. Please check your connection.</p><button onclick="location.reload()">Retry</button></div></body></html>`;
