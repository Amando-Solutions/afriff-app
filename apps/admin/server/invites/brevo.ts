// Brevo for invitations: the same API key as festival emails (server/emails/
// brevo.ts), its own sender address (e.g. invites@afriff.app). Brevo only
// delivers: the email itself is ours (shared/invites.ts renderInvite).
//   - Sends in batches: one request carries many emails, each with its own HTML.
//   - Scheduling is Brevo's own: a batch with `scheduledAt` waits at Brevo
//     (at most 72 hours ahead) and can be called off with its batchId.
//   - Statistics per invite come from the tag every one of its emails carries.
// API reference: https://developers.brevo.com/docs/batch-send-transactional-emails
//                https://developers.brevo.com/docs/schedule-batch-sendings
import type { BrevoConfig } from '../emails/brevo'
import { MailerError } from '../emails/types'
import type { DeliveryProblem, InviteMailer, InviteStats } from './types'

const API = 'https://api.brevo.com/v3'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PROBLEM_EVENTS: DeliveryProblem['kind'][] = ['hardBounces', 'softBounces', 'blocked', 'invalid']

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

export function brevoInvites(cfg: BrevoConfig, fetchImpl: typeof fetch = fetch): InviteMailer {
  const apiKey = cfg.apiKey.trim()
  const fromName = cfg.fromName.trim() || 'AFRIFF'
  const fromAddress = cfg.fromAddress.trim()
  const replyTo = cfg.replyTo.trim()
  const missing = [
    !apiKey && 'NUXT_BREVO_API_KEY (Brevo → SMTP & API → API keys)',
    !EMAIL.test(fromAddress) && 'NUXT_INVITE_FROM_ADDRESS (the address invitations come from, e.g. invites@afriff.app, checked in Brevo)',
  ].filter((m): m is string => Boolean(m))

  async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T | null> {
    if (!apiKey) throw new MailerError(401, 'Brevo isn\'t set up on the server (no NUXT_BREVO_API_KEY)', 'unauthorized')
    let res: Response
    try {
      res = await fetchImpl(`${API}${path}`, {
        method: init.method ?? 'GET',
        headers: { 'api-key': apiKey, accept: 'application/json', ...(init.body ? { 'content-type': 'application/json' } : {}) },
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(20000),
      })
    } catch (e) {
      throw new MailerError(0, `Couldn't reach Brevo (${e instanceof Error ? e.message : String(e)}).`)
    }
    if (res.status === 204) return null
    const json = (await res.json().catch(() => null)) as (T & { message?: string; code?: string }) | null
    if (res.ok) return json
    throw new MailerError(res.status, `Brevo answered ${res.status}${json?.message ? `: ${json.message}` : ''}`, String(json?.code ?? ''))
  }

  return {
    ready: missing.length === 0,
    missing,
    from: fromAddress ? `${fromName} <${fromAddress}>` : '',

    async send(b) {
      if (!b.emails.length) return
      const [first] = b.emails
      await call('/smtp/email', {
        method: 'POST',
        body: {
          sender: { name: fromName, email: fromAddress },
          ...(EMAIL.test(replyTo) ? { replyTo: { email: replyTo } } : {}),
          // the defaults; every version below carries its own
          subject: first!.subject,
          htmlContent: first!.html,
          messageVersions: b.emails.map((e) => ({ to: [e.to], subject: e.subject, htmlContent: e.html })),
          tags: [b.tag],
          ...(b.scheduledAt ? { scheduledAt: b.scheduledAt, batchId: b.batchId } : {}),
        },
      })
    },

    async cancel(batchId) {
      await call(`/smtp/email/${encodeURIComponent(batchId)}`, { method: 'DELETE' })
    },

    async stats(tag) {
      const r = await call<Record<string, unknown>>(`/smtp/statistics/aggregatedReport?days=90&tag=${encodeURIComponent(tag)}`)
      return {
        requests: num(r?.requests), delivered: num(r?.delivered), uniqueOpens: num(r?.uniqueOpens),
        hardBounces: num(r?.hardBounces), softBounces: num(r?.softBounces), blocked: num(r?.blocked), invalid: num(r?.invalid),
      } satisfies InviteStats
    },

    async problems(tag) {
      const out: DeliveryProblem[] = []
      for (const kind of PROBLEM_EVENTS) {
        const path = (tags: string) => `/smtp/statistics/events?event=${kind}&days=90&limit=1000&tags=${encodeURIComponent(tags)}`
        let r: { events?: Record<string, unknown>[] } | null
        try {
          // Brevo's docs: "serialized and urlencoded array"
          r = await call(path(JSON.stringify([tag])))
        } catch (e) {
          if (!(e instanceof MailerError) || e.status !== 400) throw e
          r = await call(path(tag))
        }
        for (const ev of r?.events ?? []) {
          // in case the tag filter was ignored, keep only this invite's
          if (ev.tag && ev.tag !== tag) continue
          out.push({ email: String(ev.email ?? '').toLowerCase(), kind, reason: String(ev.reason ?? ''), date: String(ev.date ?? '') })
        }
      }
      return out
    },
  }
}
