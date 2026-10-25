// Chrome/Edge's install offer (`beforeinstallprompt`), caught as the app starts
// (plugins/pwa.client.ts) and kept here until our Install button uses it
// (composables/useInstallApp.ts). Catching it also stops Chrome's own
// mini-infobar, since our toast offers the install instead.
//
// Done by us rather than by @vite-pwa/nuxt's client plugin (switched off in
// packages/pwa/nuxt.config.ts): that plugin also force-reloads every open page when a new
// version arrives, which would interrupt a door volunteer mid-count, and its
// "not now" hides the install offer for good instead of for a week.
import { reactive } from 'vue'
import { isStandalone } from './platform'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const installState = reactive({
  /** Chrome has offered an install we can trigger with one tap */
  canPrompt: false,
  /** running as the installed app, or just installed */
  installed: false,
})

let deferred: BeforeInstallPromptEvent | null = null

export function listenForInstallPrompt() {
  installState.installed = isStandalone()
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    installState.canPrompt = true
  })
  // also hears installs done from the browser's own menu
  window.addEventListener('appinstalled', () => {
    deferred = null
    installState.canPrompt = false
    installState.installed = true
  })
  window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
    if (e.matches) installState.installed = true
  })
}

/** Shows Chrome's install dialog. The offer can only be used once. */
export async function promptInstall(): Promise<'accepted' | 'dismissed'> {
  const e = deferred
  if (!e) return 'dismissed'
  deferred = null
  installState.canPrompt = false
  await e.prompt()
  const { outcome } = await e.userChoice
  if (outcome === 'accepted') installState.installed = true
  return outcome
}
