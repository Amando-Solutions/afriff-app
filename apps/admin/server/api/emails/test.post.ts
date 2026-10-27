// POST /api/emails/test { subject, message, buttonLabel, buttonUrl } (admins,
// console → Festival emails → "Send me a test"): the email, subject marked
// [Test], to the admin pressing the button and nobody else.
export default adminRoute('send festival emails', async (event, uid) => {
  const [user, profile] = await Promise.all([adminAuth().getUser(uid), adminDb().doc(`users/${uid}`).get()])
  const firstName = String(profile.get('name') || user.displayName || '').trim().split(/\s+/)[0] ?? ''
  return festivalEmails().test(await readBody(event).catch(() => null), { email: user.email ?? '', firstName }, ownAddress(event))
})
