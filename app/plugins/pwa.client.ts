/**
 * The service worker: registers it, keeps the app up to date, and catches
 * Chrome's install offer.
 *
 * REGISTERING. Done here rather than by @vite-pwa/nuxt's client plugin
 * (switched off in nuxt.config.ts, `client.registerPlugin: false`), because
 * that plugin force-reloads every open page the moment a new version arrives,
 * with no way to hold it back on the door view (see UPDATES below).
 *
 * UPDATES. The browser only looks for a new /sw.js when a page loads. An
 * installed app on a phone is rarely reloaded: Android and iOS freeze it in
 * the background and thaw the same page when it's reopened. Without this, a
 * phone that installed the app on Monday would keep Monday's version all week,
 * whatever was deployed. So we also check when the app comes back to the
 * foreground (and on reconnect, on focus, and hourly as a backstop).
 * `update()` re-fetches /sw.js past the HTTP cache (nuxt.config.ts also serves
 * it with no-cache headers); if it's different the browser installs it, and
 * `skipWaiting` + `clientsClaim` hand it this page, which fires
 * `controllerchange`. Then we reload onto the new build:
 *   - attendee screens: straight away (a second or two after reopening, the
 *     cheapest moment to interrupt anyone),
 *   - console and door view: only once the person leaves the app, so a
 *     volunteer mid-count never loses taps that haven't been sent yet.
 *
 * Ported from DP Fitness (apps/pwa/app/plugins/sw-update.client.ts).
 */
import { listenForInstallPrompt } from '~/lib/installPrompt'

/** Never check twice inside this window; a resume can fire in bursts. */
const MIN_GAP_MS = 60 * 1000

/** Backstop for an app left open in the foreground. */
const INTERVAL_MS = 60 * 60 * 1000

const onStaffScreen = () => /^\/(admin|door)(\/|$)/.test(window.location.pathname)

export default defineNuxtPlugin({
  name: 'pwa',

  setup() {
    listenForInstallPrompt()

    // No service worker in `npm run dev`: try offline and updates with
    // `npm run build` + `npm run preview`.
    if (!('serviceWorker' in navigator) || import.meta.dev) return

    let registration: ServiceWorkerRegistration | null = null

    // Booting counts as a check (registering runs one).
    let lastCheck = Date.now()

    // On the first visit there's no worker yet; the first one claiming the
    // page isn't an update (this page is already the current build).
    let controlled = !!navigator.serviceWorker.controller
    let reloading = false
    let reloadWhenHidden = false

    const reload = () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    }

    const onControllerChange = () => {
      if (!controlled) {
        controlled = true
        return
      }
      if (onStaffScreen() && document.visibilityState === 'visible') reloadWhenHidden = true
      else reload()
    }

    const check = () => {
      // An install already running (a second check would restart it), offline, or too soon.
      if (!registration || registration.installing) return
      if (navigator.onLine === false) return
      const now = Date.now()
      if (now - lastCheck < MIN_GAP_MS) return
      lastCheck = now
      // Fails when the network does, or on a 404 mid-deploy: the next resume tries again.
      void registration.update().catch(() => {})
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (reloadWhenHidden) reload()
        return
      }
      check()
    }

    // Restored from the back/forward cache: the other way a page resumes without loading.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) check()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('online', check)
    // iOS doesn't always fire visibilitychange for a home-screen app coming back
    // from the app switcher; focus covers it (extra calls are thrown away above).
    window.addEventListener('focus', check)
    const timer = setInterval(check, INTERVAL_MS)

    // Register once the page has loaded, so the worker's first download of the
    // whole app doesn't compete with the first screen for a slow connection.
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((r) => { registration = r })
        .catch((e) => console.warn('[pwa] service worker not registered', e))
    }
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })

    // For `npm run dev` hot reloads only: don't leave listeners behind.
    import.meta.hot?.dispose(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('online', check)
      window.removeEventListener('focus', check)
      clearInterval(timer)
    })
  },
})
