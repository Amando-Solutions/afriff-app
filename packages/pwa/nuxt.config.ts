/**
 * AFRIFF PWA layer (@afriff/pwa), extended by both apps. Modelled on the
 * DP Fitness member PWA.
 *
 * Everything that makes an app here a proper installable, offline-first PWA,
 * except its manifest (name, start page, colours), which each app sets in its
 * own nuxt.config.ts `pwa.manifest`:
 *   - @vite-pwa/nuxt with the service-worker defaults below,
 *   - app/plugins/pwa.client.ts: registers the worker, checks for updates
 *     whenever the app comes back to the screen, reloads onto a new version
 *     (on /admin and /door only once the person leaves the app), and catches
 *     Chrome's install offer,
 *   - app/composables/useInstallApp.ts + app/lib/installPrompt.ts: the
 *     install toast's logic (Android one tap, iPhone Share steps),
 *   - app/components/AppOfflineBanner.vue: "You're offline" / "Back online".
 * Live data offline (the Firestore cache on the device) is in @afriff/core.
 */

/** Must never be answered from an HTTP cache, or a deploy can't reach installed apps. */
const NO_CACHE = { 'Cache-Control': 'no-cache, no-store, must-revalidate' }

export default defineNuxtConfig({
  modules: ['@vite-pwa/nuxt'],

  // `ssr: false` alone writes no HTML into .output/public, and the service
  // worker needs one: prerendering `/` writes the app shell to disk, so it
  // lands in the precache and every address opens with no connection.
  // crawlLinks off: the shell is the only page worth prerendering.
  nitro: { prerender: { routes: ['/'], crawlLinks: false } },

  routeRules: {
    // A deploy only reaches a device that already has the app when the
    // browser's update check gets a byte-different /sw.js. Served from a
    // host's HTTP cache, that check gets the old bytes back and the device
    // keeps the old app. These rules are compiled into whatever the host
    // reads (Vercel's config, `_headers` elsewhere). /_nuxt/ is content-hashed.
    '/sw.js': { headers: NO_CACHE },
    '/manifest.webmanifest': { headers: NO_CACHE },
  },

  app: {
    head: {
      link: [
        // In the prerendered shell itself, so browsers see the app is
        // installable without waiting for any JavaScript.
        { rel: 'manifest', href: '/manifest.webmanifest' },
        // Firestore's address, so the first live-data request doesn't wait on DNS + TLS
        { rel: 'preconnect', href: 'https://firestore.googleapis.com', crossorigin: '' },
      ],
    },
  },

  pwa: {
    // A new version installs and takes over by itself (skipWaiting +
    // clientsClaim below). Registering, update checks, reloading onto a new
    // version and the install offer are all in app/plugins/pwa.client.ts, so
    // the module's own client plugin is off: it force-reloads every open page
    // when a deploy lands (a door volunteer would lose unsent taps) and its
    // "not now" hid the install offer for good.
    registerType: 'autoUpdate',
    injectRegister: false,
    client: { registerPlugin: false },
    workbox: {
      // Single-page app: every address opens the cached app shell, except the
      // server's own pages (e.g. the staff app's /api/emails/unsubscribe).
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//],
      // The new worker takes over open pages straight away instead of waiting
      // for every tab to close (which on a phone may be never).
      skipWaiting: true,
      clientsClaim: true,
      cleanupOutdatedCaches: true,
      // Precache the whole app: shell, every page's code (the Firebase SDK
      // included, so live data starts with no signal), fonts and icons.
      // Large photos (.jpg) are cached as they're seen instead.
      globPatterns: ['**/*.{js,css,html,png,webp,svg,ico,woff2,webmanifest}'],
      globIgnores: [
        '200.html',
        '404.html',
        '*/**/index.html',
        // Font subsets the apps don't need offline (Vietnamese stays: it covers Yoruba ẹ/ọ).
        '**/*-cyrillic*',
        '**/*-greek*',
      ],
      maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      // Firestore traffic is never touched by the service worker: the SDK
      // keeps its own offline copy in IndexedDB.
      runtimeCaching: [
        {
          // Our own images (e.g. masterclass graphics). Never change at their address.
          urlPattern: ({ sameOrigin, request }) => sameOrigin && request.destination === 'image',
          handler: 'CacheFirst',
          options: {
            cacheName: 'afriff-local-images',
            expiration: { maxEntries: 60, maxAgeSeconds: 60 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          // Firebase Storage files are immutable at their address (a new upload = a new link).
          urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\//,
          handler: 'CacheFirst',
          options: {
            cacheName: 'afriff-storage-images',
            expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          // Posters, sponsor logos and jury photos linked from other sites:
          // show the saved copy at once, refresh it in the background.
          urlPattern: ({ request }) => request.destination === 'image',
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'afriff-images',
            expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    // No service worker during `npm run dev`; use `npm run build` + `npm run preview`.
    devOptions: { enabled: false },
  },
})
