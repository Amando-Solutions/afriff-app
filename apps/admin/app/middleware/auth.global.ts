import { redirectFor } from '~/lib/access'
import { whenAuthReady } from '~/lib/useAdminAuth'

// Every page change: wait until Firebase knows who's signed in, then send
// people to /login, /pending or their home if they can't open this page.
// The rules themselves are in lib/access.ts.
export default defineNuxtRouteMiddleware(async (to) => {
  const target = redirectFor(to, await whenAuthReady())
  if (target && target !== to.fullPath) return navigateTo(target, { replace: true })
})
