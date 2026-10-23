<script setup>
import { computed } from 'vue'
import { EVENT_TYPES, isMultiDay } from '~/data/events.js'
import { time12, timeLabel } from '~/lib/format.js'
import { useFestival } from '~/lib/store.js'

const props = defineProps({ event: { type: Object, required: true } })
const { isScheduled, toggleScheduled } = useFestival()
const multi = computed(() => isMultiDay(props.event))
const t = computed(() => time12(props.event.time))
</script>

<template>
  <div class="flex items-center gap-3 border-b border-line py-3.5">
    <NuxtLink :to="`/event/${event.id}`" class="flex min-w-0 flex-1 items-start gap-3">
      <div class="w-14 shrink-0 tabular-nums">
        <template v-if="multi">
          <span class="block text-body leading-tight font-semibold text-accent-ink">Nightly</span>
          <span class="mt-1 block text-micro font-semibold text-muted">{{ timeLabel(event.time) }}</span>
        </template>
        <template v-else>
          <span class="block font-display text-h2 leading-none font-semibold text-accent-ink">{{ t.time }}</span>
          <span class="mt-1 block text-micro font-semibold text-muted">{{ t.ampm }}</span>
        </template>
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <span class="line-clamp-2 text-body font-semibold" :class="event.status === 'cancelled' && 'text-muted line-through'">{{ event.title }}</span>
        <span v-if="event.speaker" class="text-meta text-ink/80">with {{ event.speaker }}</span>
        <VenueLine :venue-id="event.venue" :place="event.place"><StatusTag :status="event.status" /></VenueLine>
        <span class="text-micro font-semibold tracking-wider text-accent-ink uppercase">{{ EVENT_TYPES[event.type].label }}{{ event.access?.startsWith('Free') ? ' · Free' : '' }}</span>
      </div>
      <EventThumb :event="event" class="aspect-[4/5] w-12 rounded-thumb" />
    </NuxtLink>
    <span v-if="multi" class="size-9 shrink-0" />
    <AddButton v-else :added="isScheduled(event.id)" :title="event.title" @toggle="toggleScheduled(event.id)" />
  </div>
</template>
