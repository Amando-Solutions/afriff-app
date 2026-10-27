// The console calling its own server (server/api/attendees/*, server/api/emails/*)
// for the admin jobs that need keys a browser can't hold. Sends the admin's
// Firebase sign-in; the server checks they're an admin. Problems come back
// as { error: { message } } and are thrown here as plain-words Errors.
import { auth } from './firebase'

export async function adminCall<T>(path: string, body?: unknown): Promise<T> {
  const user = auth.currentUser
  if (!user) throw new Error('Sign in again first.')
  let res: Response
  try {
    res = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Couldn\'t reach the staff app\'s server. Check your connection and try again.')
  }
  const json = (await res.json().catch(() => null)) as { error?: { message?: string }; statusMessage?: string } | null
  if (!res.ok) throw new Error(json?.error?.message || json?.statusMessage || `The server answered ${res.status}.`)
  return json as T
}
