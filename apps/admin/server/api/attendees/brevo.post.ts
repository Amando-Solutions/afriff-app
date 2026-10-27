// POST /api/attendees/brevo (admins, console → Attendees → "Send to Brevo"):
// people who ticked the email box go on the Brevo "App subscribers" list,
// people who unticked it come off, and accounts deleted in the app have their
// Brevo contact deleted. 50 of each per call; the console repeats while `more`.
export default attendeeAdminRoute('send contacts to Brevo', () => attendeeAdmin().sendToBrevo(50))
