// Brevo (AFRIFF's email service), sending only: the console writes the email,
// the staff app's server hands it to Brevo, Brevo delivers it. No contact list
// is kept at Brevo; who gets festival emails is decided in our database
// (attendees/{uid}.marketing), so there's nothing to keep in step.
//
// Set up (staff app's settings, see .env.example, all server-only):
//   NUXT_BREVO_API_KEY        Brevo → SMTP & API → API keys (SECRET)
//   NUXT_EMAIL_FROM_ADDRESS   the sender, e.g. news@afriff.com. Brevo only sends
//                             from an address or domain checked in Brevo
//                             (Senders, Domains & Dedicated IPs); authenticate
//                             afriff.com there so emails don't land in spam.
//   NUXT_EMAIL_FROM_NAME      optional, default "AFRIFF"
//   NUXT_EMAIL_REPLY_TO       optional: where replies go (default: the sender)
//
// Uses Brevo's batch sending: one request carries up to 1,000 emails, each
// with its own HTML (so each has its own name and unsubscribe link).
// API reference: https://developers.brevo.com/docs/batch-send-transactional-emails
import { MailerError, type Mailer } from './types'

export interface BrevoConfig {
  apiKey: string
  fromAddress: string
  fromName: string
  replyTo: string
}

const API = 'https://api.brevo.com/v3/smtp/email'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function brevoMailer(cfg: BrevoConfig, fetchImpl: typeof fetch = fetch): Mailer {
  const fromName = cfg.fromName.trim() || 'AFRIFF'
  const fromAddress = cfg.fromAddress.trim()
  const replyTo = cfg.replyTo.trim()
  const missing = [
    !cfg.apiKey.trim() && 'NUXT_BREVO_API_KEY (Brevo → SMTP & API → API keys)',
    !EMAIL.test(fromAddress) && 'NUXT_EMAIL_FROM_ADDRESS (the address emails come from, checked in Brevo)',
  ].filter((m): m is string => Boolean(m))

  return {
    ready: missing.length === 0,
    missing,
    from: fromAddress ? `${fromName} <${fromAddress}>` : '',

    async send(emails) {
      if (!emails.length) return
      const [first] = emails
      let res: Response
      try {
        res = await fetchImpl(API, {
          method: 'POST',
          headers: { 'api-key': cfg.apiKey.trim(), 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            sender: { name: fromName, email: fromAddress },
            ...(EMAIL.test(replyTo) ? { replyTo: { email: replyTo } } : {}),
            // the defaults; every version below carries its own
            subject: first!.subject,
            htmlContent: first!.html,
            messageVersions: emails.map((e) => ({ to: [e.to], subject: e.subject, htmlContent: e.html })),
            tags: ['afriff-festival-email'],
          }),
          signal: AbortSignal.timeout(20000),
        })
      } catch (e) {
        throw new MailerError(0, `Couldn't reach Brevo (${e instanceof Error ? e.message : String(e)}).`)
      }
      if (res.ok) return
      const detail = (await res.json().catch(() => null)) as { message?: string; code?: string } | null
      throw new MailerError(res.status, `Brevo answered ${res.status}${detail?.message ? `: ${detail.message}` : ''}`, String(detail?.code ?? ''))
    },
  }
}
