// Attendee avatars (header + Profile): a DiceBear "Open Peeps" drawing
// (https://www.dicebear.com/styles/open-peeps/, CC0: free for any use, no
// credit needed) picked by a seed. The seed is the account's ID, so everyone
// gets their own random picture, and it's the same on every phone they log
// in on. Drawn on the phone: no request to DiceBear, works offline once
// loaded, nothing about the person leaves the phone. The drawing code
// (lib/avatarDrawing.ts) is a separate download, fetched only once someone
// is signed in (not part of the offline copy every phone saves).
// To try another style: change lib/avatarDrawing.ts and apps/pwa/package.json
// (pick a CC0 style, e.g. '@dicebear/lorelei', and check its size).

// warm festival colours behind the drawing (gold, peach, sky, lilac, coral),
// and a range of brown skin tones for an African festival's audience
const BACKGROUNDS = ['e9c362', 'dba440', 'f2c9a0', 'a4c8e6', 'c9b8f0', 'f3a08f']
const SKIN = ['8d5524', 'a26d3d', '6b3e1f', 'c68642', '4a2a12', 'b07042']

/** seed → picture (an SVG data address), so each is drawn once per visit */
const drawn = new Map<string, string>()

/** The picture already drawn for this seed, if any (no waiting). */
export const drawnAvatar = (seed: string) => drawn.get(seed) ?? ''

/** Draws the avatar for this seed; an SVG data address for an <img>. */
export async function drawAvatar(seed: string): Promise<string> {
  const ready = drawn.get(seed)
  if (ready) return ready
  const { drawOpenPeeps } = await import('./avatarDrawing')
  const uri = drawOpenPeeps(seed, BACKGROUNDS, SKIN)
  drawn.set(seed, uri)
  return uri
}
