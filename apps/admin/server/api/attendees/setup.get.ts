// GET /api/attendees/setup (admins, console → Attendees): is the server's
// service-account key there (needed to delete accounts and to send festival
// emails), and is sending festival emails set up (Brevo key + sender)?
export default adminRoute('see the attendee settings', async () => ({
  serviceAccount: hasServiceAccount(),
  emails: emailMailer().ready,
}))
