<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ChevronRightIcon, DownloadIcon } from 'lucide-vue-next'
import { testSwitch } from '@afriff/core/utils/now'
import { browserCanPush, pushConfigured, pushState, turnOffAlerts, turnOnAlerts } from '~/lib/push'

// "Alerts on this phone": push notifications when AFRIFF publishes an
// announcement, and invitations sent to whoever is logged in (lib/push.ts). On News and Profile. Hidden where it can't
// work (alerts not set up on this deploy, or a browser with no push); on an
// iPhone in Safari it says to add the app to the Home Screen first, the only
// way iOS allows notifications from a web app, and tapping it opens the steps.
// Android / Chrome: the switch works in the browser; while the app isn't
// installed and Chrome offers it, an Install button sits under the switch.
// `invite`: worded for a guest on a VIP link's page (pages/vip/[code].vue).
// Test the iPhone card on a laptop: ?install=ios (on a build with alerts set up).
const props = defineProps<{ invite?: boolean }>()
const install = useInstallApp()
const mode = ref<'hidden' | 'install-first' | 'switch'>('hidden')
onMounted(() => {
  if (!pushConfigured()) return
  if (install.method.value === 'ios' || testSwitch('install') === 'ios') mode.value = 'install-first'
  else if (browserCanPush()) mode.value = 'switch'
})

const stepsOpen = ref(false)

async function toggle(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.checked) await turnOnAlerts()
  else await turnOffAlerts()
  input.checked = pushState.on // e.g. permission refused: back to off
}

const installing = ref(false)
async function runInstall() {
  installing.value = true
  try {
    await install.install()
  } finally {
    installing.value = false
  }
}
</script>

<template>
  <button v-if="mode === 'install-first'" type="button" class="share-row alerts-how" aria-haspopup="dialog" @click="stepsOpen = true">
    <span class="share-text">
      <span class="share-title">Alerts on your iPhone</span>
      <span v-if="props.invite" class="muted small">To get a notification when your invitation is sent, add AFRIFF to your Home Screen first.</span>
      <span v-else class="muted small">Add AFRIFF to your Home Screen first, then turn alerts on in the app.</span>
      <span class="alerts-how-cta">Show me how <ChevronRightIcon :size="16" aria-hidden="true" /></span>
    </span>
    <BottomSheet v-model:open="stepsOpen" title="Add to Home Screen">
      <p class="muted">iPhones only allow alerts from apps on the Home Screen. Adding AFRIFF takes a few seconds:</p>
      <InstallSteps />
      <p class="alerts-then">
        Then open AFRIFF from your Home Screen,
        {{ props.invite ? 'log in' : 'log in if you have an account' }},
        and turn alerts on in Profile.
      </p>
      <button type="button" class="btn btn-gold alerts-done" @click="stepsOpen = false">Got it</button>
    </BottomSheet>
  </button>
  <div v-else-if="mode === 'switch'" class="share-row alerts-card">
    <label class="alerts-line">
      <span class="share-text">
        <span class="share-title">Alerts on this phone</span>
        <span v-if="props.invite" class="muted small">A notification on this phone when your invitation is sent, as well as the email. Also for big festival news and changes to screenings.</span>
        <span v-else class="muted small">A notification when a screening moves, is cancelled or sells out, for big festival news and, when you're logged in, for invitations sent to you.</span>
        <span v-if="pushState.busy" class="muted small" role="status">One moment…</span>
        <span v-else-if="pushState.permission === 'denied'" class="small tone-alert">Notifications are blocked for AFRIFF. Allow them in your phone's settings, then turn this on.</span>
        <span v-else-if="pushState.error" class="small tone-alert" role="alert">{{ pushState.error }}</span>
      </span>
      <input type="checkbox" role="switch" class="switch" :checked="pushState.on" :disabled="pushState.busy" @change="toggle" />
    </label>
    <div v-if="install.method.value === 'prompt'" class="alerts-install">
      <span class="muted small">Install the AFRIFF app: one tap from your home screen, and it works without data.</span>
      <button type="button" class="btn btn-gold btn-small" :disabled="installing" @click="runInstall">
        <DownloadIcon :size="16" aria-hidden="true" /> Install
      </button>
    </div>
  </div>
</template>
