// Brevo (AFRIFF's email service): the "App subscribers" contact list. Only
// people who ticked "Yes, AFRIFF can email me festival news and updates" are
// ever added. People who didn't tick it are never put on a Brevo list; the
// full "App users" list stays in our database (console → Attendees).
// (Password-reset emails come from Firebase, not Brevo.)
//
// Set up (staff app's settings, see .env.example, all server-only):
//   NUXT_BREVO_API_KEY          Brevo → SMTP & API → API keys (SECRET)
//   NUXT_BREVO_LIST_ID          the number of the "App subscribers" list (Contacts → Lists)
//   NUXT_BREVO_DOI_TEMPLATE_ID  optional: a Brevo double opt-in template. When
//                               set, Brevo first emails a confirm link and adds
//                               them to the list only once they click it.
//   NUXT_BREVO_DOI_REDIRECT_URL where the confirm link lands (default: the attendee app)
// API reference: https://developers.brevo.com/reference
import type { MarketingList } from './types'

export interface BrevoConfig {
  apiKey: string
  listId: number
  doiTemplateId: number
  doiRedirectUrl: string
}

const API = 'https://api.brevo.com/v3'

export function brevoList(cfg: BrevoConfig, fetchImpl: typeof fetch = fetch): MarketingList {
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

  const ready = Boolean(cfg.apiKey) && cfg.listId > 0

  return {
    ready,
    doubleOptIn: ready && cfg.doiTemplateId > 0,

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
}
