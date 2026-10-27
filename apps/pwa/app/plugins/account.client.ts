// Attendee accounts (lib/account.ts), set up as the app starts.
import { SCREENINGS, filmById } from '@afriff/core/data/programme'
import { EVENTS } from '@afriff/core/data/events'
import { canSaveNow, loadAccountSetting, rememberSave, resumeAccount } from '~/lib/account'
import { notify } from '~/lib/notice'
import { guardSaves, type SaveIntent } from '~/lib/store'

/** "Lady", "Acting for Screen with RMD"… for the offline message */
function titleOf({ kind, id }: SaveIntent): string {
  if (kind === 'seen') return filmById(id)?.title ?? ''
  const screening = SCREENINGS.find((s) => s.id === id)
  if (screening) return filmById(screening.film)?.title ?? ''
  return EVENTS.find((e) => e.id === id)?.title ?? ''
}

export default defineNuxtPlugin({
  name: 'account',
  setup(nuxtApp) {
    // Saving to My Festival with no account: go to the sign-up page, which
    // saves it once they've signed up or logged in, and then comes back here.
    // With no internet they can't sign up, so say so instead (nothing is saved).
    guardSaves((intent) => {
      if (canSaveNow()) return true
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const title = titleOf(intent)
        const what = title ? `“${title}”` : 'it'
        notify(
          'You’re offline',
          intent.kind === 'seen'
            ? `Connect to the internet to sign in and mark ${what} as seen.`
            : `Connect to the internet to sign in and add ${what} to My Festival.`,
        )
        return false
      }
      rememberSave(intent)
      const router = nuxtApp.$router
      void router.push({ path: '/auth', query: { redirect: router.currentRoute.value.fullPath, why: intent.kind } })
      return false
    })

    // Once the first screen shows: reconnect a signed-in person's Firebase
    // sign-in (from the phone, works offline) and keep My Festival in step
    // with their account; if the sign-in is gone, ask them to log in again.
    // Then read the console's "Require an account" switch (one small read).
    nuxtApp.hook('app:mounted', () => {
      void resumeAccount().then((ok) => {
        if (!ok) void nuxtApp.$router.replace({ path: '/auth', query: { mode: 'login', again: '1' } })
      })
      void loadAccountSetting()
    })
  },
})
