// "Are you sure?" and "Add a note" in the console's own look, instead of the
// browser's confirm() and prompt() boxes (user request 27 Oct: no browser pop-ups
// anywhere). One bottom sheet (components/AdminConfirm.vue, mounted once in
// app.vue), opened from code:
//
//   if (!(await confirmAction({ title: 'Publish to the app?', confirmLabel: 'Publish' }))) return
//   const note = await askNote({ title: 'Reject this change?', noteLabel: 'Reason', confirmLabel: 'Reject' })
//   if (note === null) return // cancelled
//
// Closing the sheet (✕, Esc, tapping outside) is the same as Cancel. One
// question at a time: asking a new one cancels one still open.
import { reactive } from 'vue'

export interface ConfirmOptions {
  /** the question, as the sheet's heading: "Delete this screening?" */
  title: string
  /** what happens, in plain words; a blank line starts a new paragraph */
  message?: string
  /** a short list under the message (e.g. the alerts a publish posts) */
  items?: string[]
  /** the button that goes ahead: "Publish", "Delete" */
  confirmLabel: string
  cancelLabel?: string
  /** danger: a red button, for what can't be undone */
  tone?: 'primary' | 'danger'
}

export interface NoteOptions extends ConfirmOptions {
  /** the note box's label */
  noteLabel: string
  placeholder?: string
  /** the note must be written before going ahead */
  required?: boolean
  maxLength?: number
}

export const confirmDialog = reactive({
  open: false,
  kind: 'confirm' as 'confirm' | 'note',
  options: null as (ConfirmOptions & Partial<NoteOptions>) | null,
  note: '',
  error: '',
})

let resolver: ((ok: boolean) => void) | null = null

function ask(kind: 'confirm' | 'note', options: ConfirmOptions | NoteOptions): Promise<boolean> {
  resolver?.(false)
  Object.assign(confirmDialog, { open: true, kind, options, note: '', error: '' })
  return new Promise((resolve) => { resolver = resolve })
}

/** True when they press the confirm button; false for Cancel or closing the sheet. */
export const confirmAction = (options: ConfirmOptions) => ask('confirm', options)

/** The note they wrote (trimmed; '' if optional and left empty), or null if they cancelled. */
export async function askNote(options: NoteOptions): Promise<string | null> {
  return (await ask('note', options)) ? confirmDialog.note.trim() : null
}

/** The sheet's buttons, and closing it (= Cancel). */
export function answerConfirm(ok: boolean) {
  if (!resolver) return
  if (ok && confirmDialog.kind === 'note' && confirmDialog.options?.required && !confirmDialog.note.trim()) {
    confirmDialog.error = 'Write a note first.'
    return
  }
  const resolve = resolver
  resolver = null
  confirmDialog.open = false
  resolve(ok)
}
