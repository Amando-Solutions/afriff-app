// The small pages people reach from an email's links (festival emails' and
// invitations' Unsubscribe, an invitation's "Add to calendar"): AFRIFF's
// colours, one heading, a line of text, and optionally one form button and
// some link buttons. No scripts.
import { escapeHtml } from '#shared/festivalEmail'

export interface PageLink { label: string; href: string; download?: string }

export function emailPage(appUrl: string, title: string, text: string, opts: { button?: string; links?: PageLink[] } = {}) {
  const app = appUrl ? `<p><a href="${escapeHtml(appUrl)}">Open the AFRIFF app</a></p>` : ''
  const links = (opts.links ?? []).map((l) => `<a class="button${l === opts.links![0] ? '' : ' ghost'}" href="${escapeHtml(l.href)}"${l.download ? ` download="${escapeHtml(l.download)}"` : ''}>${escapeHtml(l.label)}</a>`).join('\n')
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} · AFRIFF</title>
<style>
body{margin:0;background:#060A26;color:#F3F3FF;font:16px/1.6 Arial,Helvetica,sans-serif}
main{max-width:30rem;margin:0 auto;padding:3rem 1.25rem}
.brand{font-weight:bold;letter-spacing:3px;color:#E9C262;font-size:1.25rem;margin:0 0 2rem}
h1{font-size:1.5rem;line-height:1.3;margin:0 0 .75rem}
p{color:#A4AACC;margin:0 0 1.25rem}
a{color:#E9C262}
button,.button{display:inline-block;font:inherit;font-weight:bold;background:#D9A441;color:#060A26;border:0;border-radius:999px;padding:.8rem 1.5rem;cursor:pointer;text-decoration:none;margin:0 .5rem .75rem 0}
.ghost{background:transparent;color:#F3F3FF;border:1px solid #20264A}
</style>
</head>
<body><main>
<p class="brand">AFRIFF</p>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(text)}</p>
${opts.button ? `<form method="post"><p><button type="submit">${escapeHtml(opts.button)}</button></p></form>` : ''}
${links ? `<div>${links}</div>` : ''}
${app}
</main></body>
</html>`
}

/** Headers for those pages: never cached, never indexed, nothing loaded from elsewhere. */
export function emailPageHeaders(event: Parameters<typeof setResponseHeaders>[0]) {
  setResponseHeaders(event, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  })
}

/** the database not answering shouldn't leave someone staring at a blank page */
export const within = <T>(work: Promise<T>, ms: number) =>
  Promise.race([work, new Promise<never>((_, fail) => setTimeout(() => fail(new Error(`no answer in ${ms / 1000} s`)), ms))])
