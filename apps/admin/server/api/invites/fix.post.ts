// POST /api/invites/fix { id, key, email } (admins only): a bounced guest's
// corrected address, queued to resend ("Resend to fixed addresses").
export default adminRoute('fix guests\' addresses', async (event) => {
  const b = await bodyOf(event)
  return invitations().fix(b.id, b.key, b.email)
})
