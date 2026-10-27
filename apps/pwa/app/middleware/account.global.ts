import { account, mayUseApp, safeRedirect } from '~/lib/account'

// The sign-up page comes first: anyone not signed in (and not let in for this
// visit with "Continue for now" / "Skip for now") is sent to /auth, which
// remembers where they were going (a QR code to a film page, say) and takes
// them there afterwards. The privacy notice is open to everyone.
const OPEN = new Set(['/auth', '/privacy'])

export default defineNuxtRouteMiddleware((to) => {
  // old #/ links: old-hash.global.ts forwards them first, then this runs again
  if (to.hash?.startsWith('#/')) return
  // staff links: forwarded to the staff app (StaffRedirect), no account needed
  if (to.path.startsWith('/admin') || to.path.startsWith('/door')) return

  if (!mayUseApp()) {
    if (OPEN.has(to.path)) return
    return navigateTo({ path: '/auth', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }, { replace: true })
  }
  if (to.path === '/auth' && account.profile) return navigateTo(safeRedirect(to.query.redirect) || '/', { replace: true })
})
