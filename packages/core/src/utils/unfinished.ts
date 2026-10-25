// Text that isn't ready to show attendees: "Synopsis coming soon", "Venue to
// be announced", "TBC", "lorem ipsum", "test"… Attendee screens treat it as
// empty, so an unfinished field disappears instead of being shown.
// Only the attendee app applies this; the console always shows the real value,
// so the team can see what still needs filling in.

const UNFINISHED = /coming soon|to be (announced|confirmed)|\bTB[AC]\b|lorem ipsum|placeholder|^\s*(test|testing|todo|xxx+)\b/i

export const isUnfinished = (text: string | null | undefined) => !text || !text.trim() || UNFINISHED.test(text)

/** The text, or '' when it's unfinished */
export const finished = (text: string | null | undefined) => (isUnfinished(text) ? '' : text!.trim())
