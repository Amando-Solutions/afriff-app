// Festival emails: what an admin writes in the console (Festival emails page)
// and how it looks in people's inboxes.
//
// Shared by the console (checks while typing, the preview) and the staff app's
// server (server/emails/*, which checks again and sends), so the preview is
// exactly what's sent. Each email starts with "Hi <first name>," and ends with
// the person's own unsubscribe link.
//
// The message is plain text: a blank line starts a new paragraph, and links
// starting with https:// become clickable. Nothing typed can become HTML.
import { webLink } from '@afriff/core/utils/links'

export interface EmailDraft {
  subject: string
  message: string
  /** optional button under the message, e.g. "Register on afriff.com" */
  buttonLabel: string
  buttonUrl: string
}

export const EMAIL_LIMITS = { subject: 150, message: 10000, buttonLabel: 40, buttonUrl: 2000 } as const

export const EMPTY_DRAFT: EmailDraft = { subject: '', message: '', buttonLabel: '', buttonUrl: '' }

/** Whatever arrived (a request body, a saved draft) as a draft with trimmed text. */
export function cleanDraft(raw: unknown): EmailDraft {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const text = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    subject: text(r.subject).replace(/\s+/g, ' ').trim(),
    message: text(r.message).replace(/\r\n?/g, '\n').trim(),
    buttonLabel: text(r.buttonLabel).replace(/\s+/g, ' ').trim(),
    buttonUrl: text(r.buttonUrl).trim(),
  }
}

/** What's wrong with each field, in plain words (fields that are fine are left out). */
export function draftProblems(raw: EmailDraft): Partial<Record<keyof EmailDraft, string>> {
  const d = cleanDraft(raw)
  const out: Partial<Record<keyof EmailDraft, string>> = {}
  const tooLong = (v: string, max: number) => (v.length > max ? `Too long: ${v.length} characters (${max} at most).` : null)

  const subject = !d.subject ? 'Write a subject: it\'s what people see in their inbox.' : tooLong(d.subject, EMAIL_LIMITS.subject)
  if (subject) out.subject = subject
  const message = !d.message ? 'Write the message.' : tooLong(d.message, EMAIL_LIMITS.message)
  if (message) out.message = message

  if (d.buttonLabel || d.buttonUrl) {
    const label = !d.buttonLabel ? 'Add the button\'s text, or clear the link.' : tooLong(d.buttonLabel, EMAIL_LIMITS.buttonLabel)
    if (label) out.buttonLabel = label
    let url: string | null = null
    if (!d.buttonUrl) url = 'Add the link the button opens, or clear its text.'
    else if (d.buttonUrl.length > EMAIL_LIMITS.buttonUrl) url = `That link is too long (${EMAIL_LIMITS.buttonUrl} characters at most).`
    else if (!webLink(d.buttonUrl)) url = 'Paste the full link, starting with https://'
    else if (!/^https:\/\//i.test(d.buttonUrl)) url = 'Use the https:// version of this link.'
    if (url) out.buttonUrl = url
  }
  return out
}

// ---------- The email itself ----------

export interface Recipient {
  firstName: string
  /** this person's own unsubscribe link */
  unsubscribeUrl: string
  /** the attendee app's address ("Open the AFRIFF app") */
  appUrl: string
}

/**
 * Text made safe for HTML. Braces become character codes too, so Brevo's
 * template language never reads "{{ … }}" typed in a message as an instruction.
 */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"'{}]/g, (c) => `&#${c.charCodeAt(0)};`)
}

const LINK = /https:\/\/[^\s<>"']+/g

/** One paragraph: escaped, https links made clickable, single line breaks kept. */
function paragraph(text: string): string {
  let html = ''
  let last = 0
  for (const m of text.matchAll(LINK)) {
    // a full stop or bracket right after a link belongs to the sentence
    const url = m[0].replace(/[.,;:!?)\]]+$/, '')
    const at = m.index ?? 0
    html += escapeHtml(text.slice(last, at))
    html += `<a href="${escapeHtml(url)}" style="color:#9A6A12;text-decoration:underline;">${escapeHtml(url)}</a>`
    last = at + url.length
  }
  html += escapeHtml(text.slice(last))
  return html.replace(/\n/g, '<br>')
}

const FONT = 'font-family:Arial,Helvetica,sans-serif;'

/** The email's HTML for one person. Table layout and inline styles: what email apps understand. */
export function renderEmail(raw: EmailDraft, to: Recipient): string {
  const d = cleanDraft(raw)
  const paragraphs = d.message.split(/\n[ \t]*\n+/).map((p) => p.trim()).filter(Boolean)
  const greeting = to.firstName.trim() ? `Hi ${escapeHtml(to.firstName.trim())},` : 'Hello,'
  // the grey line inbox lists show after the subject
  const preview = escapeHtml(d.message.replace(/\s+/g, ' ').slice(0, 140))
  const button = d.buttonLabel && d.buttonUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;"><tr><td style="border-radius:999px;background:#D9A441;">`
      + `<a href="${escapeHtml(d.buttonUrl)}" style="display:inline-block;padding:13px 26px;${FONT}font-size:16px;font-weight:bold;color:#060A26;text-decoration:none;border-radius:999px;">${escapeHtml(d.buttonLabel)}</a>`
      + `</td></tr></table>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(d.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#EEEFF5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEEFF5;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;">
<tr><td style="background:#060A26;padding:22px 28px;">
<div style="${FONT}font-size:22px;font-weight:bold;letter-spacing:3px;color:#E9C262;">AFRIFF</div>
<div style="${FONT}font-size:13px;line-height:1.5;color:#A4AACC;margin-top:4px;">Africa International Film Festival &middot; Lagos</div>
</td></tr>
<tr><td style="padding:28px 28px 12px;${FONT}font-size:16px;line-height:1.6;color:#1B1F3B;">
<p style="margin:0 0 16px;">${greeting}</p>
${paragraphs.map((p) => `<p style="margin:0 0 16px;">${paragraph(p)}</p>`).join('\n')}
${button}
</td></tr>
<tr><td style="padding:20px 28px 24px;${FONT}font-size:12px;line-height:1.6;color:#6B7090;">
<div style="border-top:1px solid #E4E6EF;padding-top:16px;">You&#39;re getting this because you said yes to festival emails in the AFRIFF app.<br>
<a href="${escapeHtml(to.unsubscribeUrl)}" style="color:#6B7090;text-decoration:underline;">Unsubscribe</a> &middot; <a href="${escapeHtml(to.appUrl)}" style="color:#6B7090;text-decoration:underline;">Open the AFRIFF app</a></div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
