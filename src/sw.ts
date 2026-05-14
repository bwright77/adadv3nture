/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any }

// ── Precache (injected by vite-plugin-pwa at build time) ─────────────────
precacheAndRoute(self.__WB_MANIFEST)

// ── Runtime caching — port of the previous generateSW config ─────────────
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' }),
)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
)
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage'),
  new CacheFirst({
    cacheName: 'supabase-storage',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
)
registerRoute(
  ({ url }) => url.hostname === 'api.openweathermap.org',
  new NetworkFirst({
    cacheName: 'openweather',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 300 })],
  }),
)

// ── Push notification handler ────────────────────────────────────────────
// Payload (when sent encrypted by web-push) is JSON: { title?, body?, url? }.
// Falls back to generic copy so an empty/garbled push still nudges.
self.addEventListener('push', (event) => {
  let title = 'adadv3nture'
  let body = 'Your morning briefing is ready'
  let url = '/'
  if (event.data) {
    try {
      const payload = event.data.json()
      if (typeof payload.title === 'string') title = payload.title
      if (typeof payload.body === 'string') body = payload.body
      if (typeof payload.url === 'string') url = payload.url
    } catch {
      // Non-JSON payload (or no payload) — keep defaults.
    }
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/aDADv3nture_badge.png',
      tag: 'morning-briefing',
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | null)?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      // Focus an existing tab if we have one.
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            try { await (client as any).navigate(url) } catch { /* ignore */ }
          }
          return
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url)
      }
    }),
  )
})
