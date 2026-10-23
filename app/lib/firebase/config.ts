// Which Firebase project the app talks to.
//
// The values come from `runtimeConfig.public.firebase` in nuxt.config.ts
// (override any of them with NUXT_PUBLIC_FIREBASE_* variables, e.g. to point a
// test build at another project). They're public identifiers, not secrets:
// what protects the database is firestore.rules.
//
// Read when the database is first needed, whatever asks first: the attendee
// feed after the first screen, or the console / door view, whose code can load
// before any plugin has run when /admin or /door is opened directly.
// This file has no Firebase imports, so it costs nothing on first paint.
import { tryUseNuxtApp } from '#app'

export interface FirebaseWebConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

type WithNuxt = Window & { __NUXT__?: { config?: { public?: { firebase?: FirebaseWebConfig } } } }

export function firebaseConfig(): FirebaseWebConfig {
  const config =
    (tryUseNuxtApp()?.$config.public.firebase as FirebaseWebConfig | undefined) ??
    // Nuxt writes the public config into the page itself (index.html)
    (window as WithNuxt).__NUXT__?.config?.public?.firebase
  if (!config?.projectId || !config.apiKey) {
    throw new Error('Firebase project details missing: check runtimeConfig.public.firebase in nuxt.config.ts.')
  }
  return config
}
