<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DownloadIcon, PlusSquareIcon, ShareIcon, XIcon } from 'lucide-vue-next'

/**
 * The install toast above the bottom bar (logic in useInstallApp, from @afriff/pwa):
 * - Android / Chrome / Edge: "Install the AFRIFF app" → the browser's own install dialog
 * - iPhone / iPad (Safari has no install prompt): how to use Share → Add to Home Screen
 * Not shown on top of the first-open welcome cards. "Not now" is remembered for a week.
 *
 * There's no "new version ready" toast any more: a new version installs by
 * itself and the app reloads onto it when it's next reopened
 * (plugins/sw-update.client.ts).
 */
const install = useInstallApp()
const welcomeOpen = useState('welcome-open', () => false)

// give people a moment with the app before asking on iPhone
const iosReady = ref(false)
onMounted(() => {
  setTimeout(() => { iosReady.value = true }, 15000)
})

const blocked = computed(() => welcomeOpen.value || install.snoozed.value)
const showInstall = computed(() => !blocked.value && install.method.value === 'prompt')
const showIos = computed(() => !blocked.value && install.method.value === 'ios' && iosReady.value)

const busy = ref(false)
async function run() {
  busy.value = true
  try {
    await install.install()
  } finally {
    busy.value = false
  }
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
        v-if="showInstall"
        key="install"
        class="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-pop"
      >
        <AppLogo :show-wordmark="false" />
        <div class="flex-1">
          <p class="font-semibold">Install the AFRIFF app</p>
          <p class="mt-0.5 text-meta text-muted">One tap from your home screen, and it works without data.</p>
          <div class="mt-3 flex gap-2">
            <UiButton size="sm" :disabled="busy" @click="run">
              <DownloadIcon aria-hidden="true" />
              Install
            </UiButton>
            <UiButton size="sm" variant="ghost" @click="install.snooze()">Not now</UiButton>
          </div>
        </div>
        <button type="button" class="pressable -m-1 grid size-8 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink" aria-label="Dismiss" @click="install.snooze()">
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
          <p class="mt-2 text-label text-subtle">No Share button? You’re in another app’s browser. Open this page in Safari first.</p>
        </div>
        <button type="button" class="pressable -m-1 grid size-8 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink" aria-label="Dismiss" @click="install.snooze()">
          <XIcon class="size-4" />
        </button>
      </div>
    </Transition>
  </div>
</template>
