// Quennie backoffice service worker: installable app shell + offline fallback.
// Data comes from server functions, so those always go to the network.
//
// Install must be instant: the browser only offers "Install app" once this worker is
// active, so it precaches small static files only. Pages (which need the session and the
// studio's data) are cached as they are visited, never during install.
const VERSION = 'quennie-v3'
const SHELL = ['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/favicon.png']

const OFFLINE = `<!doctype html><html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quennie · Sem ligação</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#faf7f2;color:#2a1e17;font-family:system-ui,sans-serif;text-align:center;padding:24px">
<div><p style="font-size:28px;margin:0 0 8px">Sem ligação</p><p style="opacity:.7;margin:0 0 20px">Verifique a internet e tente outra vez.</p>
<button onclick="location.reload()" style="border:0;border-radius:999px;background:#2a1e17;color:#faf7f2;padding:12px 22px;font-size:15px">Tentar outra vez</button></div></body></html>`

self.addEventListener('install', (event) => {
  self.skipWaiting()
  // A missing file must not block the install.
  event.waitUntil(caches.open(VERSION).then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})))))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.pathname.startsWith('/_serverFn')) return

  // Pages: network first, last good copy when offline, then a small offline page.
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
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit || caches.match('/'))
            .then((hit) => hit || new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })),
        ),
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
