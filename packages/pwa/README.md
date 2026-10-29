# @afriff/pwa

What makes both apps proper offline-first PWAs, as a Nuxt layer (modelled on the DP Fitness member PWA). Each app adds only its own `pwa.manifest`.

- `nuxt.config.ts`: `@vite-pwa/nuxt` with the shared service worker (whole build precached, app-shell fallback, image caching, `skipWaiting` + `clientsClaim`), no-cache headers for `/sw.js` and the manifest, prerendered shell.
- `app/plugins/pwa.client.ts`: registers the worker, checks for updates when the app returns to the foreground, reloads onto a new version (on `/admin` and `/door` only once the person leaves the app), catches Chrome's install offer.
- `app/composables/useInstallApp.ts`, `app/lib/installPrompt.ts`, `app/lib/platform.ts`: install toast logic (Android one tap, iPhone Share steps; closing it lasts until the next full reload).
- `app/components/AppOfflineBanner.vue`: "You're offline" / "Back online" (message per app).
