// Brevo (AFRIFF's email service), for attendee accounts:
//   - the "your code" email for Forgot PIN (a transactional email: it goes to
//     anyone who asks, whether or not they ticked the marketing box),
//   - the "App subscribers" contact list: only people who ticked "Yes, AFRIFF
//     can email me festival news and updates" are ever added.
// People who didn't tick the box are never put on a Brevo list. The full
// "App users" list stays in our database (console → Attendees).
//
// Set up (staff app's settings, see .env.example, all server-only):
//   NUXT_BREVO_API_KEY        Brevo → SMTP & API → API keys (SECRET)
//   NUXT_BREVO_SENDER_EMAIL   an address on a domain verified in Brevo (Senders, domains)
//   NUXT_BREVO_SENDER_NAME    e.g. AFRIFF
//   NUXT_BREVO_LIST_ID        the number of the "App subscribers" list (Contacts → Lists)
//   NUXT_BREVO_DOI_TEMPLATE_ID  optional: a Brevo double opt-in template. When
//                             set, Brevo first emails a confirm link and adds
//                             them to the list only once they click it.
//   NUXT_BREVO_DOI_REDIRECT_URL where the confirm link lands (default: the attendee app)
// API reference: https://developers.brevo.com/reference
import type { Mailer, MarketingList } from './types'

export interface BrevoConfig {
  apiKey: string
  senderEmail: string
  senderName: string
  listId: number
  doiTemplateId: number
  doiRedirectUrl: string
}

const API = 'https://api.brevo.com/v3'

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export function brevo(cfg: BrevoConfig, fetchImpl: typeof fetch = fetch): { mail: Mailer; list: MarketingList } {
  async function call(method: string, path: string, body?: unknown, ignore: number[] = []) {
    const res = await fetchImpl(`${API}${path}`, {
      method,
      headers: { 'api-key': cfg.apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok || ignore.includes(res.status)) return
    const detail = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(`Brevo answered ${res.status}${detail?.message ? `: ${detail.message}` : ''}`)
  }

  const mailReady = Boolean(cfg.apiKey && cfg.senderEmail)
  const listReady = mailReady && cfg.listId > 0

  // the code email needs only the key and a sender
  const mail: Mailer = {
    ready: mailReady,
    async sendCode(to, code) {
      const hello = to.name ? `Hi ${to.name},` : 'Hi,'
      await call('POST', '/smtp/email', {
        sender: { email: cfg.senderEmail, name: cfg.senderName || 'AFRIFF' },
        to: [{ email: to.email, ...(to.name ? { name: to.name } : {}) }],
        subject: `${code} is your AFRIFF app code`,
        textContent: `${hello}\n\nYour code for the AFRIFF festival app is ${code}.\n\nType it in the app to choose a new PIN. It works for 15 minutes.\n\nDidn't ask for it? Ignore this email: your PIN hasn't changed.\n\nAFRIFF · Africa International Film Festival`,
        htmlContent: `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#111">
<p>${escapeHtml(hello)}</p>
<p>Your code for the AFRIFF festival app is</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:8px 0 16px">${code}</p>
<p>Type it in the app to choose a new PIN. It works for 15 minutes.</p>
<p style="color:#555">Didn't ask for it? Ignore this email: your PIN hasn't changed.</p>
<p style="color:#555">AFRIFF · Africa International Film Festival</p>
</div>`,
        tags: ['afriff-app-pin-code'],
      })
    },
  }

  // the "App subscribers" list also needs its number
  const list: MarketingList = {
    ready: listReady,
    doubleOptIn: listReady && cfg.doiTemplateId > 0,
    async add({ email, firstName, lastName }) {
      const attributes = { FIRSTNAME: firstName, LASTNAME: lastName }
      if (cfg.doiTemplateId > 0) {
        await call('POST', '/contacts/doubleOptinConfirmation', {
          email, attributes, includeListIds: [cfg.listId], templateId: cfg.doiTemplateId, redirectionUrl: cfg.doiRedirectUrl,
        })
        return 'confirm-sent'
      }
      await call('POST', '/contacts', { email, attributes, listIds: [cfg.listId], updateEnabled: true })
      return 'sent'
    },

    async remove(email) {
      // 400/404: already off the list, or never on it (e.g. never confirmed)
      await call('POST', `/contacts/lists/${cfg.listId}/contacts/remove`, { emails: [email] }, [400, 404])
    },

    async forget(email) {
      await call('DELETE', `/contacts/${encodeURIComponent(email)}`, undefined, [404])
    },
  }

  return { mail, list }
}
