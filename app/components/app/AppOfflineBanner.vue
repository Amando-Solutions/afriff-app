<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { WifiIcon, WifiOffIcon } from 'lucide-vue-next'

/*
  The connection, said once for the whole app: a band under the header while
  the phone is offline, and "Back online" for a moment when it returns (live
  data catches up by itself then; see lib/firebase/app.ts).

  It only ever says there's NO connection, never that one works: `navigator.onLine`
  being true only means some network is up (a captive portal counts).
  Ported from DP Fitness (OfflineBanner.vue).
*/
const online = useOnline()

const open = ref(!online.value)
const kind = ref<'offline' | 'back'>('offline')

/** How long "Back online" stays before the band folds away. */
const BACK_MS = 2400
let timer: ReturnType<typeof setTimeout> | null = null

watch(online, (now) => {
  if (timer) clearTimeout(timer)
  timer = null
  if (!now) {
    kind.value = 'offline'
    open.value = true
    return
  }
  // Only a return is announced; online from the start is the ordinary case.
  if (!open.value) return
  kind.value = 'back'
  timer = setTimeout(() => {
    open.value = false
    timer = null
  }, BACK_MS)
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div>
    <p role="status" class="sr-only">{{ open ? (kind === 'offline' ? 'You’re offline' : 'Back online') : '' }}</p>
    <div
      class="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
      :class="open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
      aria-hidden="true"
    >
      <div class="min-h-0 overflow-hidden">
        <p class="flex items-center justify-center gap-2 border-b border-line bg-raised px-4 py-2 text-center text-meta font-medium text-ink">
          <template v-if="kind === 'offline'">
            <WifiOffIcon class="size-4 shrink-0 text-muted" />
            You’re offline. The programme and your plan still work.
          </template>
          <template v-else>
            <WifiIcon class="size-4 shrink-0 text-success" />
            Back online
          </template>
        </p>
      </div>
    </div>
  </div>
</template>
