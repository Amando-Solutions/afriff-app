// POST /api/invites/stats { id } (admins and editors, the invite log): Brevo's
// counts for this invite (sent, delivered, opened, bounced), our unsubscribe
// count, and the addresses that didn't take it.
export default staffRoute('see the invitation log', async (event) => invitations().stats((await bodyOf(event)).id))
