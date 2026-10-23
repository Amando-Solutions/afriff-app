// AFRIFF festival companion: Nuxt PWA.
// SPA mode (ssr: false): everything runs in the browser, so the app opens
// instantly from the phone's saved copy and keeps working offline. There are
// no server routes: phones read and write Firestore directly with the Firebase
// SDK, whose on-phone cache handles offline and reconnecting
// (app/lib/firebase/app.ts). The host only serves static files.
import tailwindcss from '@tailwindcss/vite'

const DESCRIPTION = 'AFRIFF festival companion: programme, queues and your festival plan.'

/** Must never be answered from an HTTP cache, or a deploy can't reach installed apps. */
const NO_CACHE = { 'Cache-Control': 'no-cache, no-store, must-revalidate' }

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  ssr: false,
  devtools: { enabled: false },

  modules: ['@vueuse/nuxt', '@vite-pwa/nuxt'],

  // `ssr: false` alone writes no HTML into .output/public, and the service
  // worker needs one: prerendering `/` writes the app shell to disk, so it
  // lands in the precache and every address opens with no connection.
  // crawlLinks off: the shell is the only page worth prerendering.
  nitro: { prerender: { routes: ['/'], crawlLinks: false } },

  routeRules: {
    // A deploy only reaches a phone that already has the app when the
    // browser's update check gets a byte-different /sw.js. Served from a
    // host's HTTP cache, that check gets the old bytes back and the phone
    // keeps the old app. These rules are compiled into whatever the host reads
    // (Vercel's config, or `_headers` elsewhere). Everything under /_nuxt/
    // is content-hashed, so it needs nothing.
    '/sw.js': { headers: NO_CACHE },
    '/manifest.webmanifest': { headers: NO_CACHE },
  },

  // Fonts are bundled with the app (no Google Fonts request), so they work offline.
  // Components are used by their file name (e.g. <FilmPoster>), whatever folder they're in.
  components: [{ path: '~/components', pathPrefix: false }],

  css: [
    '@fontsource-variable/onest',
    '@fontsource-variable/archivo',
    '~/assets/css/main.css',
  ],

  // Which Firebase project to use. These are public identifiers, not secrets
  // (firestore.rules is what protects the data). Override any of them with
  // NUXT_PUBLIC_FIREBASE_* variables (see .env.example), e.g. to point a
  // test deploy at a separate project.
  runtimeConfig: {
    public: {
      firebase: {
        apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCPxdNaQyK6r4OU97-zBZBKLqHsHunGzYo',
        authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'afriff-app.firebaseapp.com',
        projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'afriff-app',
        storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'afriff-app.firebasestorage.app',
        messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '396757035301',
        appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || '1:396757035301:web:abf6a05cf9014ad3b412cc',
      },
    },
  },

  vite: {
    server: {
      allowedHosts: true, // lets a phone on the same Wi-Fi open the dev server
    },
    plugins: [tailwindcss()],
    // the console's chunk is big on purpose (only staff open it)
    build: { chunkSizeWarningLimit: 700 },
    // pre-bundle these for `npm run dev`, so the first page load doesn't reload itself
    optimizeDeps: { include: ['lucide-vue-next', 'firebase/app', 'firebase/auth', 'firebase/firestore'] },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'AFRIFF 2026',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: DESCRIPTION },
        { name: 'theme-color', content: '#060A26' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'AFRIFF' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        // In the prerendered shell itself, so browsers see the app is installable
        // without waiting for any JavaScript (the manifest is generated from `pwa.manifest`).
        { rel: 'manifest', href: '/manifest.webmanifest' },
        // Firestore's address, so the first live-data request doesn't wait on DNS + TLS
        { rel: 'preconnect', href: 'https://firestore.googleapis.com', crossorigin: '' },
      ],
    },
  },

  pwa: {
    // A new version installs and takes over by itself (skipWaiting +
    // clientsClaim below). Registering, update checks, reloading onto a new
    // version and the install offer are all in plugins/pwa.client.ts, so the
    // module's own client plugin is off: it would force-reload the door view
    // mid-count whenever a deploy landed.
    registerType: 'autoUpdate',
    injectRegister: false,
    manifest: {
      id: '/',
      name: 'AFRIFF 2026 · Africa International Film Festival',
      short_name: 'AFRIFF',
      description: DESCRIPTION,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#060A26',
      theme_color: '#060A26',
      categories: ['entertainment', 'events'],
      icons: [
        { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Single-page app: every address opens the cached app shell.
      navigateFallback: '/',
      // The new worker takes over open pages straight away instead of waiting
      // for every tab to close (which on a phone may be never).
      skipWaiting: true,
      clientsClaim: true,
      cleanupOutdatedCaches: true,
      // Precache the whole app: shell, every page's code (the Firebase SDK
      // included, so live data starts with no signal), fonts and icons. The
      // console and door view are in too, so a volunteer can open /door in a
      // cinema with no signal; their taps wait on the phone until it's back.
      // The masterclass graphics (.jpg, 250–350 KB each) are cached as they're seen.
      globPatterns: ['**/*.{js,css,html,png,webp,svg,ico,woff2,webmanifest}'],
      globIgnores: [
        '200.html',
        '404.html',
        '*/**/index.html',
        // Font subsets the app doesn't need offline (Vietnamese stays: it covers Yoruba ẹ/ọ).
        '**/*-cyrillic*',
        '**/*-greek*',
      ],
      maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      // Firestore traffic is never touched by the service worker: the SDK
      // keeps its own offline copy in IndexedDB.
      runtimeCaching: [
        {
          // Our own images: masterclass graphics. Never change at their address.
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
    client: { registerPlugin: false },
    // No service worker during `npm run dev`; use `npm run build` + `npm run preview`.
    devOptions: { enabled: false },
  },
})
