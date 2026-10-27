// Attendee accounts (lib/account.ts), set up as the app starts.
import { configureAccounts, resumeAccount } from '~/lib/account'

export default defineNuxtPlugin({
  name: 'account',
  setup(nuxtApp) {
    configureAccounts(nuxtApp.$config.public)

    // Once the first screen shows: reconnect a signed-in person's Firebase
    // sign-in (from the phone, works offline) and keep My Festival in step
    // with their account. If the sign-in is gone, ask them to log in again.
    nuxtApp.hook('app:mounted', () => {
      void resumeAccount().then((ok) => {
        if (!ok) void nuxtApp.$router.replace({ path: '/auth', query: { mode: 'login', again: '1' } })
      })
    })
  },
})
