// POST /api/emails/send { subject, message, buttonLabel, buttonUrl } (admins,
// console → Festival emails → "Send to N people"): records the email in
// emails/{id} and starts sending it to everyone who said yes to festival
// emails. Sends for a few seconds; the console then calls /api/emails/continue
// while `more` (server/emails/logic.ts).
export default adminRoute('send festival emails', async (event, uid) => {
  const profile = await adminDb().doc(`users/${uid}`).get()
  return festivalEmails().start(await readBody(event).catch(() => null), { uid, name: String(profile.get('name') ?? '') }, ownAddress(event))
})
