// GET /api/invites/setup (admins and editors, console → Invitations): can the
// server send invitations (Brevo key and sender address set), and from where?
export default staffRoute('prepare invitations', async () => invitations().setup())
