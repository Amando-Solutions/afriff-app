<script setup>
import { computed } from 'vue'
import { VENUES } from '~/data/programme.js'
import { dayItems } from '~/lib/dayItems.js'

// Tap venues on and off; more than one can be on. None on = all venues.
const props = defineProps({ day: { type: String, required: true }, type: { type: String, default: 'all' } })
const selected = defineModel({ type: Array, required: true })
const items = computed(() => dayItems(props.day, props.type))
const count = (vid) => items.value.filter((i) => i.venue === vid).length
function toggle(vid) {
  const next = selected.value.includes(vid) ? selected.value.filter((v) => v !== vid) : [...selected.value, vid]
  selected.value = next.length === VENUES.length ? [] : next
}
</script>

<template>
  <div role="group" aria-label="Venues" class="scroll-row gap-1.5">
    <UiChip :on="selected.length === 0" @click="selected = []">All venues</UiChip>
    <UiChip v-for="v in VENUES" :key="v.id" :on="selected.includes(v.id)" @click="toggle(v.id)">
      <VenueDot :venue-id="v.id" /> {{ v.name }} <span class="text-subtle tabular-nums">{{ count(v.id) }}</span>
    </UiChip>
  </div>
</template>
