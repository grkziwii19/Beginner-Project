// sw.js (SAFE NEXT.JS PWA - NO ROUTE INTERCEPT)

const CACHE_NAME = 'gr-assistant-v1'

// file static saja
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.json'
]

// INSTALL
self.addEventListener('install', (event) => {
  self.skipWaiting()

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
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

// FETCH (SAFE MODE)
self.addEventListener('fetch', (event) => {
  const { request } = event

  // ❌ JANGAN INTERCEPT NEXT.JS INTERNAL REQUEST
  if (
    request.url.includes('/_next/') ||
    request.url.includes('/api/') ||
    request.url.includes('?rsc=') ||
    request.method !== 'GET'
  ) {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // clone response only if valid
        if (!response || response.status !== 200) {
          return response
        }

        const responseClone = response.clone()

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone)
        })

        return response
      })
      .catch(() => {
        return caches.match(request)
      })
  )
})