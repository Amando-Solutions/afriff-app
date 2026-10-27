import { account, safeRedirect } from '~/lib/account'

// Anyone can browse the whole app without an account. Sign-up is asked for
// only when someone saves something to My Festival (+ on a screening or
// event, "Seen it" on a film): lib/store.ts asks lib/account.ts first, which
// sends them to /auth and saves it once they've signed up (plugins/account.client.ts).
// Here: someone already signed in who opens /auth goes back where they were.
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/auth' && account.profile) return navigateTo(safeRedirect(to.query.redirect) || '/', { replace: true })
})
