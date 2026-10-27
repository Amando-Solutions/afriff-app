// The avatar drawings themselves (DiceBear core + the Notionists Neutral
// style, ~20 KB gzipped). Only loaded with import() from lib/avatar.ts, so
// they stay off the first screen's download.
import { createAvatar } from '@dicebear/core'
import * as notionistsNeutral from '@dicebear/notionists-neutral'

export function drawNotionistsNeutral(seed: string, backgroundColor: string[]): string {
  return createAvatar(notionistsNeutral, { seed, backgroundColor }).toDataUri()
}
