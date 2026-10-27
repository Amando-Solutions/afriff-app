// POST /api/account/login { email, pin } → { token, profile }
// Wrong PINs: 5 in a row pause the account 15 minutes; 10 need a new PIN (server/accounts/logic.ts).
export default accountRoute((event, body) => attendeeAccounts().logIn(body as { email: unknown; pin: unknown }, networkOf(event)))
