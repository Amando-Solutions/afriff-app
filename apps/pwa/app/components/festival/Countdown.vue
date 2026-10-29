<script setup lang="ts">
import { computed } from 'vue'
import { useLiveClock } from '~/lib/queues'

// A ticking countdown: numbers in a row with their labels under and gold
// colons between, seconds in light gold. Its own component so only the
// numbers redraw every second, not the whole page.
// Home before the festival: days / hours / mins / secs to opening night.
// My Festival's Upcoming (small): hrs / mins / secs to a saved screening.
// My plan sheet (inline): one line, "Starts in 42:10".
const props = defineProps<{
  /** when it reaches zero (ms) */
  to: number
  /** include a days unit (opening night) */
  days?: boolean
  /** smaller */
  small?: boolean
  /** one line of text */
  inline?: boolean
  /** read out before the numbers, e.g. "Opening night starts in" */
  label: string
}>()

const t = useLiveClock(1000)
const pad = (n: number) => String(n).padStart(2, '0')
const left = computed(() => Math.max(0, Math.floor((props.to - t.value) / 1000)))
const units = computed(() => {
  const s = left.value
  const list = [
    { n: props.days ? Math.floor((s % 86400) / 3600) : Math.floor(s / 3600), l: props.small ? 'Hrs' : 'Hours' },
    { n: Math.floor((s % 3600) / 60), l: 'Mins' },
    { n: s % 60, l: 'Secs' },
  ]
  return props.days ? [{ n: Math.floor(s / 86400), l: 'Days' }, ...list] : list
})
// "42:10", or "1:05:00" from an hour away
const short = computed(() => {
  const h = Math.floor(left.value / 3600)
  const ms = `${pad(Math.floor((left.value % 3600) / 60))}:${pad(left.value % 60)}`
  return h ? `${h}:${ms}` : ms
})
// screen readers: to the minute is plenty
const spoken = computed(() => `${props.label} ${units.value.slice(0, -1).map((u) => `${u.n} ${u.l.toLowerCase()}`).join(', ')}`)
</script>

<template>
  <span v-if="inline" class="timer-inline" role="timer" :aria-label="spoken">Starts in <strong>{{ short }}</strong></span>
  <div v-else class="timer" :class="{ small }" role="timer" :aria-label="spoken">
    <template v-for="(u, i) in units" :key="u.l">
      <span v-if="i" class="timer-colon" aria-hidden="true">:</span>
      <span class="timer-unit" aria-hidden="true">
        <span class="timer-n">{{ pad(u.n) }}</span>
        <span class="timer-l">{{ u.l }}</span>
      </span>
    </template>
  </div>
</template>
