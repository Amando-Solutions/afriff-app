// POST /api/attendees/brevo (admins, console → Attendees → "Send to Brevo"):
// people who ticked the email box but aren't on the Brevo list yet (Brevo
// wasn't set up when they signed up, or it failed) are added, 50 per call.
export default attendeeAdminRoute('send contacts to Brevo', () => attendeeAccounts().sendWaitingToBrevo(50))
