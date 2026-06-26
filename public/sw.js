const CACHE_NAME = 'gr-assistant-v1'

// hanya file yang PASTI ADA
const STATIC_ASSETS = [
  '/favicon.ico'
]

// INSTALL (SAFE)
self.addEventListener('install', (event) => {
  self.skipWaiting()

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset)
        } catch (err) {
          console.log('[SW] skip cache failed:', asset)
        }
      }
    })
  )
})

// ACTIVATE
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    )
  )

  self.clients.claim()
})

// FETCH (ULTRA SAFE)
self.addEventListener('fetch', (event) => {
  const req = event.request

  if (
    req.method !== 'GET' ||
    req.url.includes('/_next/') ||
    req.url.includes('/api/') ||
    req.url.includes('?rsc=')
  ) {
    return
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        // hanya cache response valid
        if (!res || res.status !== 200) return res

        const clone = res.clone()

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, clone).catch(() => {})
        })

        return res
      })
      .catch(() => caches.match(req))
  )
})