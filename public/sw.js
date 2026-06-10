const CACHE_NAME = 'summit-app-v1';
const MAP_TILE_CACHE = 'summit-map-tiles';

// Assets estáticos mínimos para pre-cachear en la instalación
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== MAP_TILE_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper para determinar si una petición es una tesela de mapa
function isMapTileRequest(url) {
  const urlString = url.toString();
  return (
    urlString.includes('tile.openstreetmap.org') ||
    urlString.includes('basemaps.cartocdn.com') ||
    urlString.includes('opentopomap.org') ||
    urlString.includes('tile.thunderforest.com') ||
    urlString.includes('arcgisonline.com') ||
    urlString.includes('mt0.google.com') ||
    urlString.includes('mt1.google.com') ||
    urlString.includes('mt2.google.com') ||
    urlString.includes('mt3.google.com') ||
    urlString.includes('/wms') ||
    urlString.includes('wms-pendientes.idee.es') ||
    urlString.includes('ign.es/wms-inspire')
  );
}

self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Manejo de teselas de mapa (Caché de teselas)
  if (isMapTileRequest(url)) {
    event.respondWith(
      caches.open(MAP_TILE_CACHE).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            // Guardar en caché y retornar
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // Si falla la red, intentar servir desde la caché
            return cache.match(event.request).then((cachedResponse) => {
              if (cachedResponse) return cachedResponse;
              
              // Si no está en caché, devolver una tesela vacía o error
              return new Response('', { status: 404, statusText: 'Offline Map Tile Not Found' });
            });
          });
      })
    );
    return;
  }

  // 2. Manejo de assets de la aplicación (HTML, JS, CSS, etc.)
  // Excluimos llamadas a Supabase u otros servicios externos que no sean estáticos
  const isStaticAsset = 
    url.origin === self.location.origin ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset && !url.pathname.includes('/api/') && !url.hostname.includes('supabase.co')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Ignorar errores de red para dejar que funcione el fallback de caché
              return cachedResponse;
            });

          // Retornar la respuesta cacheada inmediatamente, o esperar a la red si no existe
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 3. Estrategia por defecto: pasar a la red
  event.respondWith(
    fetch(event.request).catch(() => {
      // Fallback para index.html si falla la navegación offline
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html') || caches.match('/');
      }
      return new Response('Red no disponible', { status: 503, statusText: 'Service Unavailable' });
    })
  );
});
