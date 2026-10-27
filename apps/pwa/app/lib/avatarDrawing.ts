// The avatar drawings themselves (DiceBear core + the Open Peeps style, ~107 KB
// gzipped). Only ever loaded with import() from lib/avatar.ts, so they become
// their own download, named avatar-<hash>.js (nuxt.config.ts). That download
// is left out of the offline copy every phone saves up front: only people who
// sign in fetch it, once, and the service worker keeps it after that.
import { createAvatar } from '@dicebear/core'
import * as openPeeps from '@dicebear/open-peeps'

export function drawOpenPeeps(seed: string, backgroundColor: string[], skinColor: string[]): string {
  return createAvatar(openPeeps, { seed, backgroundColor, skinColor, maskProbability: 0 }).toDataUri()
}
