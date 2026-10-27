// A short message near the bottom of the screen, for when a tap can't do what
// it would normally do (e.g. saving to My Festival with no account and no
// internet). One at a time; it goes away by itself. Shown by AppNotice.vue.
import { reactive } from 'vue'

export const notice = reactive({
  /** changes with every new message, so the same one shown twice still animates */
  id: 0,
  title: '',
  text: '',
})

const SHOW_MS = 5000
let timer: ReturnType<typeof setTimeout> | null = null

export function notify(title: string, text: string) {
  if (timer) clearTimeout(timer)
  Object.assign(notice, { id: notice.id + 1, title, text })
  timer = setTimeout(dismissNotice, SHOW_MS)
}

export function dismissNotice() {
  if (timer) clearTimeout(timer)
  timer = null
  Object.assign(notice, { title: '', text: '' })
}
