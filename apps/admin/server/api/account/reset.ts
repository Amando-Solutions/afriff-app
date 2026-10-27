// POST /api/account/reset { email, code, pin } → { token, profile }: new PIN with the emailed code, and logged in.
export default accountRoute((event, body) => attendeeAccounts().resetPin(body as { email: unknown; code: unknown; pin: unknown }, networkOf(event)))
