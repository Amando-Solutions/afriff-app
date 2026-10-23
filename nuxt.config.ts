// AFRIFF festival companion: Nuxt PWA.
// SPA mode (ssr: false): everything runs in the browser, so the app opens
// instantly from the phone's saved copy and keeps working offline. The two
// relays in server/api run on the host (Vercel functions) and keep database
// reads low.
import tailwindcss from '@tailwindcss/vite'

const DESCRIPTION = 'AFRIFF festival companion: programme, queues and your festival plan.'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  ssr: false,
  devtools: { enabled: false },

  modules: ['@vueuse/nuxt', '@vite-pwa/nuxt'],

  // Build the app shell (index.html) ahead of time, so the service worker can
  // keep a copy and every page opens with no connection.
  nitro: { prerender: { routes: ['/'] } },

  // Fonts are bundled with the app (no Google Fonts request), so they work offline.
  // Components are used by their file name (e.g. <FilmPoster>), whatever folder they're in.
  components: [{ path: '~/components', pathPrefix: false }],

  css: [
    '@fontsource-variable/onest',
    '@fontsource-variable/archivo',
    '~/assets/css/main.css',
  ],

  vite: {
     server: {
      allowedHosts: true // 👈 This allows your phone's IP to access the dev server
    },
    plugins: [tailwindcss()],
    // the admin console's Firebase chunk is big on purpose (and only staff load it)
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
      ],
    },
  },

  pwa: {
    // "prompt": a new version waits until the person taps Reload in the toast.
    registerType: 'prompt',
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
      // every address opens the same app shell (it's a single-page app)
      navigateFallback: '/index.html',
      // The admin console and the relays are never answered from the offline copy.
      navigateFallbackDenylist: [/^\/api\//],
      // Precache the app shell, fonts and icons. The masterclass graphics are
      // big (250–350 KB each), so they're cached the first time they're seen instead.
      globPatterns: ['**/*.{js,css,html,png,webp,svg,ico,woff2,webmanifest}'],
      globIgnores: [
        '200.html',
        '404.html',
        '*/**/index.html',
        // Font subsets the app doesn't need offline (Vietnamese stays: it covers Yoruba ẹ/ọ).
        '**/*-cyrillic*',
        '**/*-greek*',
      ],
      // The admin console chunk (Firebase, ~640 KB) is only for staff: leaving out files
      // over 400 KB keeps it out of every attendee's offline download.
      maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      manifestTransforms: [
        (entries) => ({ manifest: entries.filter((e) => e.size <= 400 * 1024), warnings: [] }),
      ],
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          // Posters, masterclass graphics, sponsor logos and jury photos: keep a copy once seen.
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
    client: {
      installPrompt: true,
      // Look for a new version of the app every hour while it's open.
      periodicSyncForUpdates: 60 * 60,
    },
    devOptions: {
      // Flip to true to try the service worker during `npm run dev`.
      enabled: false,
      type: 'module',
      navigateFallback: '/',
    },
  },
})
