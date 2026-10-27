// POST /api/emails/continue { id } (admins, console → Festival emails): carries
// on sending emails/{id} from where it got to. The console calls it while
// `more`, and from "Continue sending" on a paused email.
export default adminRoute('send festival emails', async (event) => {
  const { id } = (await readBody(event).catch(() => null)) ?? {}
  if (typeof id !== 'string' || !/^[\w-]{1,64}$/.test(id)) throw createError({ statusCode: 400, statusMessage: 'That isn\'t a festival email.' })
  return festivalEmails().continue(id)
})
