// Every search box in the console matches the same way (AdminSearch.vue is the
// box). Capitals and accents don't matter, so "ife ati iku" finds "Ìfẹ́ àti Ikú"
// and "adebayo" finds "Adébáyọ̀". Each word typed can match anywhere in the
// item, so "lady landmark" finds Lady at Filmhouse Landmark.

/** text without accents or capitals, for comparing */
export const fold = (text: unknown): string =>
  String(text ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** the words typed in a search box, ready to compare; none = show everything */
export const searchWords = (query: string): string[] => fold(query).split(/\s+/).filter(Boolean)

/** true when every word appears somewhere in the texts (lists count too) */
export function matchesSearch(words: readonly string[], ...texts: unknown[]): boolean {
  if (!words.length) return true
  const haystack = fold(texts.flat().filter((x) => x != null && x !== '').join(' '))
  return words.every((w) => haystack.includes(w))
}
