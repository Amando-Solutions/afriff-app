// Push notifications, inside the attendee app's service worker.
//
// The service worker itself is generated at build time (Workbox, see
// packages/pwa/nuxt.config.ts); apps/pwa/nuxt.config.ts adds this file to it
// with `workbox.importScripts`. Plain JavaScript on purpose: it runs as-is in
// the worker, outside the app's build.
//
// Announcements arrive from Firebase Cloud Messaging as data only
// ({ data: { title, body, url, tag } }, built by the staff app's server in
// apps/admin/shared/push.ts), and this file shows them. The Firebase SDK isn't
// needed here. Every push shows a notification, as browsers require.

/* eslint-env serviceworker */

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { data: { body: event.data ? event.data.text() : '' } }
  }
  const data = payload.data || {}
  const fallback = payload.notification || {}
  const title = data.title || fallback.title || 'AFRIFF'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || fallback.body || '',
      icon: '/pwa-192x192.png',
      // same announcement twice (e.g. a retry) replaces rather than stacks
      tag: data.tag || undefined,
      lang: 'en',
      data: { url: data.url || '/news' },
    }),
  )
})

// Tapping the notification: bring the app forward on the page it points to
// (News), or open the app there if it isn't running.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL((event.notification.data && event.notification.data.url) || '/news', self.location.origin)
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
    if (open) {
      // the app moves itself to the page without reloading (plugins/push.client.ts)
      open.postMessage({ type: 'afriff:open', path: target.pathname + target.search })
      try {
        await open.focus()
      } catch {
        /* the browser refused to bring it forward: it's on the right page anyway */
      }
      return
    }
    await self.clients.openWindow(target.href)
  })())
})
