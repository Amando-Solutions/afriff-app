<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useOnline } from '@vueuse/core'
import { WifiIcon, WifiOffIcon } from 'lucide-vue-next'

// The connection, said once for the whole attendee app: a slim bar fixed to
// the top of every screen while the phone has no internet, then "Back online"
// for a moment when it returns. Rendered once in app.vue, so it's on every
// page (sign-up and privacy too). It never covers anything: while it shows it
// sets --offline-bar, which moves the page down and the sticky headers with it
// (classic.css: .app, .with-status, .header).
//
// `navigator.onLine` false is reliable; true only means some network is up
// (a captive portal counts), so this only ever says there's NO connection.
const online = useOnline()
const state = ref<'hidden' | 'offline' | 'back'>(online.value ? 'hidden' : 'offline')

/** How long "Back online" stays before the bar slides away. */
const BACK_MS = 2400
let timer: ReturnType<typeof setTimeout> | null = null

watch(online, (now) => {
  if (timer) clearTimeout(timer)
  timer = null
  if (!now) {
    state.value = 'offline'
  } else if (state.value === 'offline') {
    state.value = 'back'
    timer = setTimeout(() => { state.value = 'hidden' }, BACK_MS)
  }
})

watch(state, (s) => {
  document.documentElement.style.setProperty('--offline-bar', s === 'hidden' ? '0px' : '28px')
}, { immediate: true })

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div class="conn" :class="state" role="status" aria-live="polite">
    <p v-if="state === 'offline'" class="conn-line">
      <WifiOffIcon :size="14" :stroke-width="2.2" aria-hidden="true" />
      <strong>No internet connection</strong>
      <span class="conn-sub">· You can still browse</span>
    </p>
    <p v-else-if="state === 'back'" class="conn-line">
      <WifiIcon :size="14" :stroke-width="2.2" aria-hidden="true" />
      <strong>Back online</strong>
    </p>
  </div>
</template>
