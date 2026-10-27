// GET /api/attendees/setup (admins, console → Attendees): is the server's
// service-account key there (needed to delete accounts), and is Brevo set up?
export default attendeeAdminRoute('see the attendee settings', async () => attendeeSetup())
