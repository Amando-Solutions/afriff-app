// When a form field's problem shows, the same way in every form of both apps:
// - nothing is flagged while someone is still typing in a field;
// - leaving a field that has something in it shows its problem;
// - once a problem shows, it's checked again on every change, so it goes away
//   (or changes) the moment it's fixed;
// - pressing the form's button checks every field and puts the cursor on the
//   first problem (the first element marked aria-invalid="true");
// - a problem found elsewhere (Firebase: "wrong password") stays until that
//   field is changed.
// The checks themselves are plain functions (accounts/rules.ts, the console's
// lib/checks.ts) that return what's wrong in plain words, or null.
import { nextTick, reactive } from 'vue'

export type FieldCheck = () => string | null

/**
 * A message appearing under a field moves everything below it. Leaving a
 * field by tapping a button below it would move the button from under the
 * finger, and the tap would be lost. So the message waits this long (ms),
 * until the tap has landed.
 */
export const LEAVE_DELAY = 150

export function useFormChecks(checks: () => Record<string, FieldCheck | undefined>, valueOf: (key: string) => unknown) {
  const errors = reactive<Record<string, string>>({})
  /** problems found elsewhere, with the field's value at the time */
  const pinned = new Map<string, unknown>()

  function run(key: string) {
    if (pinned.has(key)) {
      if (errors[key] && pinned.get(key) === valueOf(key)) return
      pinned.delete(key)
    }
    const problem = checks()[key]?.() ?? null
    if (problem) errors[key] = problem
    else delete errors[key]
  }

  function clear() {
    pinned.clear()
    for (const key of Object.keys(errors)) delete errors[key]
  }

  async function focusFirst() {
    await nextTick()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }

  return {
    errors,
    /** they left a field: show its problem, unless they left it empty (that waits for the button) */
    left(key: string) {
      const value = valueOf(key)
      setTimeout(() => {
        // back in the field and typing already: that waits until they leave again
        if (valueOf(key) === value && String(value ?? '').trim()) run(key)
      }, LEAVE_DELAY)
    },
    /** something changed: re-check only the fields already showing a problem */
    recheck() {
      for (const key of Object.keys(errors)) if (checks()[key] || pinned.has(key)) run(key)
    },
    /** the button: check everything; false (and the cursor on the first problem) if anything's wrong */
    checkAll(): boolean {
      clear()
      for (const key of Object.keys(checks())) run(key)
      if (!Object.keys(errors).length) return true
      void focusFirst()
      return false
    },
    /** a problem found elsewhere (e.g. Firebase says the password is wrong): kept until that field changes */
    flag(key: string, problem: string) {
      errors[key] = problem
      pinned.set(key, valueOf(key))
      void focusFirst()
    },
    clear,
  }
}
