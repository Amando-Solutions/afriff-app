import { installState, promptInstall } from '../lib/installPrompt'
import { isIosDevice } from '../lib/platform'

/**
 * Adding the app to the home screen. Ported from DP Fitness
 * (DPfitPWA: apps/pwa/app/composables/useInstallApp.ts).
 *
 * Two very different routes behind one prompt. Chrome/Edge on Android hand
 * the page an install offer, so installing is one tap (lib/installPrompt.ts);
 * Safari never does, so on iPhone the only route is Share → Add to Home Screen
 * and the most the app can do is show where that is. `method` tells them apart.
 */

/**
 *  · `prompt` — Chrome has offered the install; one tap does it.
 *  · `ios`    — iPhone/iPad, where the Share sheet is the only route.
 */
export type InstallMethod = 'prompt' | 'ios'

export const useInstallApp = () => {
  const ios = useState<boolean>('install-ios', isIosDevice)
  // Closing the prompt (✕, "Not now", a swipe) lasts until the app is fully
  // reloaded: it's kept in memory only, never on the phone, so a refresh asks again.
  const dismissed = useState<boolean>('install-dismissed', () => false)

  // On iPhone, `navigator.standalone` (read into installState) is only true for
  // the real home-screen app. In-app browsers (Instagram, WhatsApp…) correctly
  // count as not installed, so they still get the "open in Safari" hint.
  const isInstalled = computed(() => installState.installed)

  const method = computed<InstallMethod | null>(() => {
    if (isInstalled.value) return null
    if (installState.canPrompt) return 'prompt'
    if (ios.value) return 'ios'
    return null
  })

  const install = () => promptInstall()

  const dismiss = () => {
    dismissed.value = true
  }

  return { method, isInstalled, dismissed, install, dismiss }
}
