<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { browserCanPush, pushConfigured, pushState, turnOffAlerts, turnOnAlerts } from '~/lib/push'

// "Alerts on this phone": push notifications when AFRIFF publishes an
// announcement, and invitations sent to whoever is logged in (lib/push.ts). On News and Profile. Hidden where it can't
// work (alerts not set up on this deploy, or a browser with no push); on an
// iPhone in Safari it says to add the app to the Home Screen first, the only
// way iOS allows notifications from a web app.
const install = useInstallApp()
const mode = ref<'hidden' | 'install-first' | 'switch'>('hidden')
onMounted(() => {
  if (!pushConfigured()) return
  if (install.method.value === 'ios') mode.value = 'install-first'
  else if (browserCanPush()) mode.value = 'switch'
})

async function toggle(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.checked) await turnOnAlerts()
  else await turnOffAlerts()
  input.checked = pushState.on // e.g. permission refused: back to off
}
</script>

<template>
  <div v-if="mode === 'install-first'" class="share-row">
    <span class="share-text">
      <span class="share-title">Alerts on your iPhone</span>
      <span class="muted small">Add AFRIFF to your Home Screen first (tap Share, then Add to Home Screen). Open it from there and turn alerts on here.</span>
    </span>
  </div>
  <label v-else-if="mode === 'switch'" class="share-row">
    <span class="share-text">
      <span class="share-title">Alerts on this phone</span>
      <span class="muted small">A notification when a screening moves, is cancelled or sells out, for big festival news and, when you're logged in, for invitations sent to you.</span>
      <span v-if="pushState.busy" class="muted small" role="status">One moment…</span>
      <span v-else-if="pushState.permission === 'denied'" class="small tone-alert">Notifications are blocked for AFRIFF. Allow them in your phone's settings, then turn this on.</span>
      <span v-else-if="pushState.error" class="small tone-alert" role="alert">{{ pushState.error }}</span>
    </span>
    <input type="checkbox" role="switch" class="switch" :checked="pushState.on" :disabled="pushState.busy" @change="toggle" />
  </label>
</template>
