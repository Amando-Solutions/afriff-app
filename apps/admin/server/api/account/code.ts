// POST /api/account/code { email } → { sentTo }: "Forgot PIN?" emails a 6-digit code (Brevo).
export default accountRoute((event, body) => attendeeAccounts().sendCode(body as { email: unknown }, networkOf(event)))
