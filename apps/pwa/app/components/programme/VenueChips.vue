<script setup lang="ts">
import type { DayItemType } from '~/lib/dayItems'
import { computed } from 'vue'
import { VENUES } from '@afriff/core/data/programme'
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
  <div class="chips" role="group" aria-label="Venues">
    <button type="button" :aria-pressed="selected.length === 0" class="chip" :class="{ on: selected.length === 0 }" @click="selected = []">
      All venues
    </button>
    <button
      v-for="v in VENUES"
      :key="v.id"
      type="button"
      :aria-pressed="selected.includes(v.id)"
      class="chip"
      :class="{ on: selected.includes(v.id) }"
      @click="toggle(v.id)"
    >
      <VenueDot :venue-id="v.id" /> {{ v.name }} <span class="chip-count">{{ count(v.id) }}</span>
    </button>
  </div>
</template>
