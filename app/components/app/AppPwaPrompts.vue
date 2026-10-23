<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DownloadIcon, PlusSquareIcon, RefreshCwIcon, ShareIcon, XIcon } from 'lucide-vue-next'

/**
 * The app's own little toasts above the bottom bar:
 * - "A new version is ready" (after an update was downloaded) → Reload
 * - Android / Chrome / Edge: "Install the AFRIFF app" → the browser's own install prompt
 * - iPhone / iPad (Safari has no install prompt): how to use Share → Add to Home Screen
 * Not shown on top of the first-open welcome cards. "Not now" is remembered for a week.
 */
const pwa = usePWA()
const welcomeOpen = useState('welcome-open', () => false)

const SNOOZE_KEY = 'afriff-install-snoozed'
const WEEK = 7 * 24 * 60 * 60 * 1000
const snoozed = ref(true)
const ios = ref(false)
const iosOpen = ref(false)

onMounted(() => {
  try {
    snoozed.value = Date.now() - Number(localStorage.getItem(SNOOZE_KEY) || 0) < WEEK
  } catch {
    snoozed.value = false
  }
  const ua = navigator.userAgent
  const isIos = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  ios.value = isIos && !standalone
  // give people a moment with the app before asking
  if (ios.value) setTimeout(() => { iosOpen.value = true }, 15000)
})

function snooze() {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now())) } catch { /* not saved, fine */ }
  snoozed.value = true
}

const showUpdate = computed(() => Boolean(pwa?.needRefresh))
const showInstall = computed(() => !showUpdate.value && !welcomeOpen.value && !snoozed.value && Boolean(pwa?.showInstallPrompt))
const showIos = computed(() => !showUpdate.value && !welcomeOpen.value && !snoozed.value && ios.value && iosOpen.value)

function notNow() {
  pwa?.cancelInstall()
  snooze()
}
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4"
    aria-live="polite"
  >
    <Transition
      enter-active-class="transition-[opacity,translate] duration-300 ease-out"
      enter-from-class="translate-y-3 opacity-0"
      leave-active-class="transition-[opacity,translate] duration-150 ease-out"
      leave-to-class="translate-y-2 opacity-0"
      mode="out-in"
    >
      <div
        v-if="showUpdate"
        key="update"
        class="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-card border border-line bg-surface p-2.5 pl-4 shadow-pop"
      >
        <RefreshCwIcon class="size-5 shrink-0 text-accent-ink" aria-hidden="true" />
        <p class="flex-1 text-meta font-medium">A new version of the app is ready.</p>
        <UiButton size="sm" variant="ghost" @click="pwa?.cancelPrompt()">Later</UiButton>
        <UiButton size="sm" @click="pwa?.updateServiceWorker(true)">Reload</UiButton>
      </div>

      <div
        v-else-if="showInstall"
        key="install"
        class="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-pop"
      >
        <AppLogo :show-wordmark="false" />
        <div class="flex-1">
          <p class="font-semibold">Install the AFRIFF app</p>
          <p class="mt-0.5 text-meta text-muted">One tap from your home screen, and it works without data.</p>
          <div class="mt-3 flex gap-2">
            <UiButton size="sm" @click="pwa?.install()">
              <DownloadIcon aria-hidden="true" />
              Install
            </UiButton>
            <UiButton size="sm" variant="ghost" @click="notNow">Not now</UiButton>
          </div>
        </div>
        <button type="button" class="pressable -m-1 grid size-8 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink" aria-label="Dismiss" @click="notNow">
          <XIcon class="size-4" />
        </button>
      </div>

      <div
        v-else-if="showIos"
        key="ios"
        class="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-pop"
      >
        <AppLogo :show-wordmark="false" />
        <div class="flex-1">
          <p class="font-semibold">Add AFRIFF to your Home Screen</p>
          <ol class="mt-1.5 space-y-1 text-meta text-muted">
            <li class="flex items-center gap-1.5">1. Tap <ShareIcon class="size-4 text-accent-ink" aria-label="Share" /> in Safari’s toolbar</li>
            <li class="flex items-center gap-1.5">2. Choose <span class="inline-flex items-center gap-1 font-medium text-ink"><PlusSquareIcon class="size-4" aria-hidden="true" /> Add to Home Screen</span></li>
          </ol>
        </div>
        <button type="button" class="pressable -m-1 grid size-8 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink" aria-label="Dismiss" @click="snooze">
          <XIcon class="size-4" />
        </button>
      </div>
    </Transition>
  </div>
</template>
