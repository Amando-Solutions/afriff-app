// AFRIFF staff console (apps/admin): the admin console (/admin: festival data,
// approvals, publish to app, reports, team) and the door volunteers' view
// (/door). Its own app and address, so attendees' phones never download staff
// code. Nuxt PWA in SPA mode, like the attendee app: volunteers install it on
// their phones and can count at the door with no signal.
//
// Shared with the attendee app (apps/pwa), from packages/:
//   @afriff/theme  design system: tokens, fonts, UI + brand components, icons
//   @afriff/pwa    service worker, update checks (never reloads /door
//                  mid-count), install offer, offline banner
//   @afriff/core   festival data, types, date helpers, Firebase + offline cache
// This file only holds what is particular to the console.

export default defineNuxtConfig({
  extends: ['@afriff/theme', '@afriff/pwa', '@afriff/core'],

  compatibilityDate: '2026-10-01',
  ssr: false,
  devtools: { enabled: false },

  modules: ['@vueuse/nuxt'],

  components: [{ path: '~/components', pathPrefix: false }],

  // Tailwind + the shared tokens (see the note in that file).
  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      // The attendee app's address, for "View the attendee app" links.
      // NUXT_PUBLIC_ATTENDEE_URL on the host if it moves (e.g. app.afriff.com).
      attendeeUrl: process.env.NUXT_PUBLIC_ATTENDEE_URL || (process.env.NODE_ENV === 'production' ? 'https://afriff-app-mu.vercel.app' : 'http://localhost:3000'),
    },
  },

  devServer: { port: 3001 },

  vite: {
    server: { allowedHosts: true },
    // the console's own code is big on purpose (only staff open it)
    build: { chunkSizeWarningLimit: 700 },
    optimizeDeps: { include: ['lucide-vue-next', 'firebase/app', 'firebase/auth', 'firebase/firestore'] },
  },

  app: {
    head: {
      title: 'AFRIFF Staff',
      meta: [
        { name: 'robots', content: 'noindex' },
        { name: 'description', content: 'AFRIFF staff console and door counter.' },
        { name: 'apple-mobile-web-app-title', content: 'AFRIFF Staff' },
      ],
    },
  },

  // The shared service-worker setup is in @afriff/pwa; this is the console's identity.
  // Opens at "/", which sends volunteers to /door and everyone else to /admin.
  pwa: {
    manifest: {
      id: '/',
      name: 'AFRIFF Staff · Console and door counter',
      short_name: 'AFRIFF Staff',
      description: 'AFRIFF staff console and door counter.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#060A26',
      theme_color: '#060A26',
      icons: [
        { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
  },
})
