<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { browserCanPush, pushConfigured, pushState, turnOffAlerts, turnOnAlerts } from '~/lib/push'

// "Alerts on this phone": push notifications when AFRIFF publishes an
// announcement (lib/push.ts). On News and My Festival. Hidden where it can't
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
  <div v-if="mode === 'install-first'" class="card flex flex-col gap-1 p-4">
    <span class="text-body font-semibold">Alerts on your iPhone</span>
    <span class="text-meta text-muted">Add AFRIFF to your Home Screen first (tap Share, then Add to Home Screen). Open it from there and turn alerts on here.</span>
  </div>
  <label v-else-if="mode === 'switch'" class="card flex cursor-pointer items-center gap-4 p-4">
    <span class="flex flex-1 flex-col gap-1">
      <span class="text-body font-semibold">Alerts on this phone</span>
      <span class="text-meta text-muted">A notification when a screening moves, is cancelled or sells out, and for big festival news.</span>
      <span v-if="pushState.busy" class="text-meta text-muted" role="status">One moment…</span>
      <span v-else-if="pushState.permission === 'denied'" class="text-meta text-danger">Notifications are blocked for AFRIFF. Allow them in your phone's settings, then turn this on.</span>
      <span v-else-if="pushState.error" class="text-meta text-danger" role="alert">{{ pushState.error }}</span>
    </span>
    <input type="checkbox" role="switch" class="peer sr-only" :checked="pushState.on" :disabled="pushState.busy" @change="toggle" />
    <span
      class="relative h-7 w-12 shrink-0 rounded-full bg-raised transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-ink after:shadow after:transition-transform after:content-[''] peer-checked:after:translate-x-5 peer-checked:after:bg-on-accent"
      aria-hidden="true"
    />
  </label>
</template>
