/**
 * @afriff/core as a Nuxt layer. Its code is imported directly
 * (`@afriff/core/data/programme`, `@afriff/core/utils/format`…); the layer
 * itself only carries what both apps must agree on at the config level:
 * which Firebase project they talk to.
 */
export default defineNuxtConfig({
  // Public identifiers, not secrets (firestore.rules is what protects the
  // data). Override any of them with NUXT_PUBLIC_FIREBASE_* variables (see
  // .env.example at the repo root), e.g. to point a test deploy at a
  // separate Firebase project. Read by src/firebase/config.ts.
  runtimeConfig: {
    public: {
      firebase: {
        apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || '',
      },
    },
  },
})
