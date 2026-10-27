import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

/**
 * AFRIFF design system, as a Nuxt layer (@afriff/theme).
 *
 * Both apps — the attendee PWA (apps/pwa) and the staff console (apps/admin) —
 * extend this, so a colour, a radius or a type size is defined once and the
 * two can never drift apart. What lives here is everything that is true of the
 * brand rather than of either app: the Tailwind build, the bundled
 * typeface (Manrope), the token stylesheet (styles/theme.css), the shared UI and brand
 * components, and the brand artwork and icons in public/.
 *
 * styles/theme.css is NOT registered as a `css` entry: see the note at its top.
 * Each app's app/assets/css/main.css imports Tailwind and then that file.
 *
 * Same shape as DP Fitness's packages/theme.
 */

/** Resolved from this file: `~/components` in a layer would mean the consuming app's. */
const componentsDir = fileURLToPath(new URL('./components', import.meta.url))

export default defineNuxtConfig({
  // Tailwind v4 is a Vite plugin: no PostCSS config, no tailwind.config.js.
  vite: { plugins: [tailwindcss()] },

  // Fonts are bundled (no Google Fonts request), so they work offline.
  css: ['@fontsource-variable/manrope'],

  // <UiButton>, <UiSheet>, <BrandEmblem>, <AppLogo>… by file name, in either app.
  components: [{ path: componentsDir, pathPrefix: false, extensions: ['vue'] }],

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#060A27' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      // Served from this layer's public/ (the official AFRIFF emblem and app icons).
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
})
