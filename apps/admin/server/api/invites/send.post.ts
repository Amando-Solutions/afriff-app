// POST /api/invites/send { id, mode, scheduledAt? } (ADMINS ONLY: editors
// prepare, admins approve and send):
//   mode "all"     the first send, now, or at scheduledAt (ms, up to 71 hours ahead)
//   mode "new"     only people who can get it and haven't yet
//   mode "resend"  bounced addresses an admin fixed
// Sends for a few seconds; the console then calls /api/invites/continue while `more`.
export default adminRoute('send invitations', async (event, uid) => {
  const b = await bodyOf(event)
  const profile = await adminDb().doc(`users/${uid}`).get()
  return invitations().start(b.id, b.mode, { scheduledAt: b.scheduledAt }, { name: String(profile.get('name') ?? '') }, ownAddress(event))
})
