// HeyGem Service Worker - 极简版
// 策略：app shell 预缓存 + 网络优先；只缓存同源静态资源，绝不缓存 /api 响应（避免鉴权数据落盘）

const CACHE_NAME = 'heygem-v2'
const APP_SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {})),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (!request.url.startsWith(self.location.origin)) return
  const url = new URL(request.url)
  // 接口与媒体一律走网络（带鉴权 / 签名，不可缓存）
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request).then((r) => r || caches.match('/index.html'))),
  )
})
