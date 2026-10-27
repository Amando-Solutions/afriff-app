// POST /api/invites/count { id } (admins and editors): who the invite would go
// to right now, and who's left out and why ("Send to 87 people?").
export default staffRoute('prepare invitations', async (event) => invitations().count((await bodyOf(event)).id))
