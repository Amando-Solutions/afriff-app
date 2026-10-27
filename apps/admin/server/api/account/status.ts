// GET /api/account/status (attendee phones, when the sign-up page opens):
// can accounts be used right now, can emails be sent, and must people sign up
// (the console's "Require sign-up" switch, settings/attendeeAccounts)?
// If this can't be reached, or accounts aren't set up, the attendee app lets
// people in for now rather than locking them out.
// Cached for 30 s by Vercel's CDN, so phones opening the app cost almost nothing.
let cached: { at: number; requireSignUp: boolean } | null = null

export default defineEventHandler(async (event) => {
  if (handleCors(event, { origin: '*', methods: ['GET'], maxAge: '86400' })) return
  const setup = accountsSetup()
  let requireSignUp = true // AFRIFF's choice until an admin switches it off
  if (setup.accounts) {
    if (!cached || Date.now() - cached.at > 30_000) {
      try {
        const snap = await adminDb().doc('settings/attendeeAccounts').get()
        cached = { at: Date.now(), requireSignUp: snap.get('requireSignUp') !== false }
      } catch (e) {
        console.error('[accounts] settings not read', e)
      }
    }
    requireSignUp = cached?.requireSignUp ?? true
  }
  setResponseHeader(event, 'cache-control', 'public, max-age=0, s-maxage=30')
  // list / doubleOptIn: for the console's Attendees page (harmless to show anyone)
  return { accounts: setup.accounts, email: setup.email, requireSignUp, list: setup.list, doubleOptIn: setup.doubleOptIn }
})
