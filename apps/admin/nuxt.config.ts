// AFRIFF staff console (apps/admin): sign-in (/login), the admin console (/admin: festival data,
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
    // SERVER ONLY, secret: the Firebase service-account key (the whole .json
    // file) used to send push notifications (server/utils/firebaseAdmin.ts).
    // Set NUXT_FIREBASE_SERVICE_ACCOUNT on the staff project; read at run time.
    firebaseServiceAccount: '',
    // SERVER ONLY: festival emails written in the console (Festival emails),
    // delivered by Brevo to attendees who said yes (server/emails/brevo.ts).
    // NUXT_BREVO_API_KEY is secret; the sender must be set up in Brevo.
    brevoApiKey: '',
    emailFromAddress: '',
    emailFromName: 'AFRIFF',
    emailReplyTo: '',
    // SERVER ONLY: invitations (console → Invitations, server/invites/*), same
    // Brevo key; their own sender, e.g. invites@afriff.app ('' = emailFromAddress).
    inviteFromAddress: '',
    inviteFromName: '',
    inviteReplyTo: '',
    public: {
      // The attendee app's address, for "View the attendee app" links.
      // NUXT_PUBLIC_ATTENDEE_URL on the host if it moves (e.g. app.afriff.com).
      attendeeUrl: process.env.NUXT_PUBLIC_ATTENDEE_URL || (process.env.NODE_ENV === 'production' ? 'https://afriff-app-mu.vercel.app' : 'http://localhost:3000'),
    },
  },

  devServer: { port: 3001 },

  // server/api/push/*: sends announcements as push notifications (admins,
  // from the console) and adds attendee phones to the "news" topic (from the
  // attendee app, a different address: see server/utils/pushTopic.ts).
  // server/api/attendees/*: admins deleting attendee accounts (attendees sign
  // in with Firebase directly). server/api/emails/*: admins sending festival
  // emails, and the public unsubscribe link at the bottom of each one.
  // server/api/invites/*: invitations (editors prepare and test, admins send),
  // and each invitation's public "Add to calendar" and unsubscribe links.

  vite: {
    server: { allowedHosts: true },
    // the console's own code is big on purpose (only staff open it)
    build: { chunkSizeWarningLimit: 700 },
    optimizeDeps: { include: ['lucide-vue-next', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'] },
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
  // Opens at "/", which sends signed-out people to /login, volunteers to /door
  // and everyone else to /admin (app/lib/access.ts).
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
