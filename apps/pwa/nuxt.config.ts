// AFRIFF attendee app (apps/pwa): the festival companion attendees open from a
// QR code. Nuxt PWA in SPA mode (ssr: false): everything runs in the browser,
// so the app opens instantly from the phone's saved copy and keeps working
// offline. No server routes: phones read and write Firestore directly, and
// sign-up / log-in go to the staff app's server (adminUrl, lib/account.ts).
//
// Shared with the staff console (apps/admin), from packages/:
//   @afriff/theme  design system: tokens, fonts, UI + brand components, icons
//   @afriff/pwa    service worker, update checks, install offer, offline banner
//   @afriff/core   festival data, types, date helpers, Firebase + offline cache
// This file only holds what is particular to the attendee app.

const DESCRIPTION = 'AFRIFF festival companion: programme, queues and your festival plan.'

export default defineNuxtConfig({
  extends: ['@afriff/theme', '@afriff/pwa', '@afriff/core'],

  compatibilityDate: '2026-10-01',
  ssr: false,
  devtools: { enabled: false },

  modules: ['@vueuse/nuxt'],

  // Components are used by their file name (e.g. <FilmPoster>), whatever folder they're in.
  components: [{ path: '~/components', pathPrefix: false }],

  // Tailwind + the shared tokens (see the note in that file).
  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      // Where the staff console (apps/admin) is deployed. Old /admin and
      // /door links (and #/admin, #/door QR codes) on this app are sent there.
      // Set NUXT_PUBLIC_ADMIN_URL on the host BEFORE building (the value is
      // written into the app shell at build time).
      adminUrl: process.env.NUXT_PUBLIC_ADMIN_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001'),
      // Push notifications ("Alerts on this phone", app/lib/push.ts): the
      // project's public Web Push key, from Firebase console → Project
      // settings → Cloud Messaging → Web Push certificates. Public, not a
      // secret. Without it the alerts switch stays hidden. Phones join the
      // alerts list through the staff app's server (adminUrl above).
      firebaseVapidKey: process.env.NUXT_PUBLIC_FIREBASE_VAPID_KEY || '',
      // Attendee accounts: where people write to have their account deleted or
      // ask what's kept about them (sign-up page and /privacy). AFRIFF to
      // confirm the address. Empty: those pages point to afriff.com instead.
      privacyEmail: process.env.NUXT_PUBLIC_PRIVACY_EMAIL || '',
    },
  },

  devServer: { port: 3000 },

  vite: {
    server: {
      allowedHosts: true, // lets a phone on the same Wi-Fi open the dev server
    },
    // the Firestore SDK chunk (~170 KB gzipped) is loaded after first paint on purpose
    build: { chunkSizeWarningLimit: 700 },
    // pre-bundle these for `npm run dev`, so the first page load doesn't reload itself
    optimizeDeps: { include: ['lucide-vue-next', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/messaging'] },
  },

  app: {
    head: {
      title: 'AFRIFF 2026',
      meta: [
        { name: 'description', content: DESCRIPTION },
        { name: 'apple-mobile-web-app-title', content: 'AFRIFF' },
      ],
    },
  },

  // The shared service-worker setup is in @afriff/pwa; this is the attendee app's identity.
  pwa: {
    // Shows push notifications (announcements) and opens the app when one is tapped.
    workbox: { importScripts: ['/push-sw.js'] },
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
  },
})
