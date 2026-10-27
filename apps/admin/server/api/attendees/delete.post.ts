// POST /api/attendees/delete { uid } (admins, console → Attendees): delete someone's
// account when they ask by email. Same as "Delete my account" in the app.
export default attendeeAdminRoute('delete attendee accounts', async (event) => {
  const { uid } = (await readBody(event).catch(() => null)) ?? {}
  if (typeof uid !== 'string' || !/^att_[\w-]{10,40}$/.test(uid)) throw createError({ statusCode: 400, statusMessage: 'That isn\'t an attendee account.' })
  return attendeeAccounts().remove(uid)
})
