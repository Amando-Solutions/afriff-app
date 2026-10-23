import { installState, promptInstall } from '~/lib/installPrompt'
import { isIosDevice } from '~/lib/platform'

/**
 * Adding the app to the home screen. Ported from DP Fitness
 * (apps/pwa/app/composables/useInstallApp.ts).
 *
 * Two very different routes behind one prompt. Chrome/Edge on Android hand
 * the page an install offer, so installing is one tap (lib/installPrompt.ts);
 * Safari never does, so on iPhone the only route is Share → Add to Home Screen
 * and the most the app can do is show where that is. `method` tells them apart.
 */

const SNOOZE_KEY = 'afriff-install-snoozed'
/** How long "Not now" keeps the prompt away. */
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

/**
 *  · `prompt` — Chrome has offered the install; one tap does it.
 *  · `ios`    — iPhone/iPad, where the Share sheet is the only route.
 */
export type InstallMethod = 'prompt' | 'ios'

const readSnooze = (): number => {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) || 0)
  } catch {
    return 0
  }
}

export const useInstallApp = () => {
  const ios = useState<boolean>('install-ios', isIosDevice)
  const snoozedAt = useState<number>('install-snoozed-at', readSnooze)

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

  const snoozed = computed(() => Date.now() - snoozedAt.value < SNOOZE_MS)

  const install = () => promptInstall()

  const snooze = () => {
    snoozedAt.value = Date.now()
    try {
      localStorage.setItem(SNOOZE_KEY, String(snoozedAt.value))
    } catch {
      /* not saved: fine, it's only a reminder */
    }
  }

  return { method, isInstalled, snoozed, install, snooze }
}
