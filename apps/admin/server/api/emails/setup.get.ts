// GET /api/emails/setup (admins, console → Festival emails): can the server
// send (Brevo key and sender address set), and from which address?
export default adminRoute('send festival emails', async () => {
  const { ready, missing, from } = emailMailer()
  return { ready, missing, from }
})
