// Quennie backoffice service worker: installable app shell + offline fallback.
// Data comes from server functions, so those always go to the network.
const VERSION = 'quennie-v2'
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.pathname.startsWith('/_serverFn')) return

  // Pages: network first, last good copy when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only keep real pages: never the login screen or a redirect to it.
          if (response.ok && !response.redirected && !url.pathname.startsWith('/entrar')) {
            const copy = response.clone()
            caches.open(VERSION).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/'))),
    )
    return
  }

  // Hashed assets, media and fonts: cache first.
  const cacheable =
    url.origin === self.location.origin
      ? /^\/(assets|media|icons)\//.test(url.pathname)
      : /fonts\.(googleapis|gstatic)\.com|images\.unsplash\.com/.test(url.hostname)
  if (!cacheable) return

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok || response.type === 'opaque') {
            const copy = response.clone()
            caches.open(VERSION).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
