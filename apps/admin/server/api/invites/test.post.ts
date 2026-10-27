// POST /api/invites/test { id, to } (admins and editors): the saved invite, to
// up to 5 addresses typed in, subject marked [Test]. Its unsubscribe link
// changes nothing.
export default staffRoute('send test invitations', async (event) => {
  const b = await bodyOf(event)
  return invitations().test(b.id, b.to, ownAddress(event))
})
