<script setup lang="ts">
import type { DayItemType } from '~/lib/dayItems'
import { computed } from 'vue'
import { VENUES } from '~/data/programme'
import { dayItems } from '~/lib/dayItems'

// Tap venues on and off; more than one can be on. None on = all venues.
const props = withDefaults(defineProps<{ day: string; type?: DayItemType }>(), { type: 'all' })
const selected = defineModel<string[]>({ required: true })
const items = computed(() => dayItems(props.day, props.type))
const count = (vid: string) => items.value.filter((i) => i.venue === vid).length
function toggle(vid: string) {
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
