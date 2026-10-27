// Attendee avatars (header + Profile): a DiceBear "Notionists Neutral" face
// (https://www.dicebear.com/styles/notionists-neutral/, CC0: free for any
// use, no credit needed) picked by a seed. Neutral = a face only, on a plain
// colour: no hair, body or skin tone. The seed is the account's ID, so
// everyone gets their own random face, and it's the same on every phone they
// log in on. Drawn on the phone: no request to DiceBear, works offline,
// nothing about the person leaves the phone. The drawing code
// (lib/avatarDrawing.ts) is its own small download, after the first screen.
// To try another style: change lib/avatarDrawing.ts and apps/pwa/package.json
// (pick a CC0 style; the CC BY ones need a credit in the app).

// festival colours behind the face: light gold, gold, sky, lilac, coral, mint
// (no peach or browns, so the colour reads as a colour, not a skin tone)
const BACKGROUNDS = ['e9c362', 'dba440', 'a4c8e6', 'c9b8f0', 'f3a08f', 'a8dcc0']

/** seed → picture (an SVG data address), so each is drawn once per visit */
const drawn = new Map<string, string>()

/** The picture already drawn for this seed, if any (no waiting). */
export const drawnAvatar = (seed: string) => drawn.get(seed) ?? ''

/** Draws the avatar for this seed; an SVG data address for an <img>. */
export async function drawAvatar(seed: string): Promise<string> {
  const ready = drawn.get(seed)
  if (ready) return ready
  const { drawNotionistsNeutral } = await import('./avatarDrawing')
  const uri = drawNotionistsNeutral(seed, BACKGROUNDS)
  drawn.set(seed, uri)
  return uri
}
