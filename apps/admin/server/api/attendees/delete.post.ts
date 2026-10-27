// POST /api/attendees/delete { uid } (admins, console → Attendees): delete
// someone's account when they ask by email: their records (so no more festival
// emails), and their Firebase sign-in (kept if they're also on the team).
export default adminRoute('delete attendee accounts', async (event) => {
  const { uid } = (await readBody(event).catch(() => null)) ?? {}
  if (typeof uid !== 'string' || !/^[\w-]{10,128}$/.test(uid)) throw createError({ statusCode: 400, statusMessage: 'That isn\'t an attendee account.' })
  return attendeeAdmin().remove(uid)
})
