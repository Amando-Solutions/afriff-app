// POST /api/account/marketing { idToken, marketing } → profile: the "Emails from AFRIFF" switch in My Festival.
// Ticked: on the Brevo "App subscribers" list. Unticked: taken off it.
export default accountRoute(async (_event, body) => attendeeAccounts().setMarketing(await attendeeUid(body.idToken), body.marketing))
