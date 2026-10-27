// POST /api/invites/cancel { id } (admins only): calls off a scheduled invite
// (Brevo drops it); it goes back to "waiting for approval".
export default adminRoute('call off invitations', async (event) => invitations().cancel((await bodyOf(event)).id))
