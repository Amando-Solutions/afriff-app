// POST /api/account/delete { idToken }: "Delete my account" in My Festival.
// Removes the account, its saved plan, its sign-in and its Brevo contact.
export default accountRoute(async (_event, body) => {
  const accounts = attendeeAccounts()
  return accounts.remove(await attendeeUid(body.idToken))
})
