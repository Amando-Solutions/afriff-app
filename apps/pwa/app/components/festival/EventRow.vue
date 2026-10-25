<script setup lang="ts">
import { computed } from 'vue'
import type { FestivalEvent } from '@afriff/core/types/festival'
import { EVENT_TYPES, isMultiDay } from '@afriff/core/data/events'
import { useFestival } from '~/lib/store'

// An event in a schedule list: same layout and type roles as a screening row.
const props = defineProps<{ event: FestivalEvent }>()
const { isScheduled, toggleScheduled } = useFestival()
const multi = computed(() => isMultiDay(props.event))
const free = computed(() => Boolean(props.event.access?.startsWith('Free')))
const cancelled = computed(() => props.event.status === 'cancelled')
</script>

<template>
  <div class="flex items-center gap-3 border-b border-line py-3.5">
    <NuxtLink :to="`/event/${event.id}`" class="flex min-w-0 flex-1 items-start gap-3" :class="cancelled && 'opacity-60'">
      <RowTime :time="event.time" :label="multi ? 'Nightly' : undefined" />
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="line-clamp-2 text-body font-semibold" :class="cancelled && 'line-through'">{{ event.title }}</span>
        <span v-if="event.speaker" class="truncate text-meta text-ink/80">with {{ event.speaker }}</span>
        <VenueLine :venue-id="event.venue" :place="event.place"><StatusTag :status="event.status" /></VenueLine>
        <span class="mt-1 flex items-center gap-1.5">
          <span class="eyebrow text-subtle">{{ EVENT_TYPES[event.type].label }}</span>
          <UiBadge v-if="free" tone="success">Free</UiBadge>
        </span>
      </div>
      <EventThumb :event="event" class="aspect-[4/5] w-12 rounded-thumb" />
    </NuxtLink>
    <span v-if="multi" class="size-9 shrink-0" />
    <AddButton v-else :added="isScheduled(event.id)" :title="event.title" @toggle="toggleScheduled(event.id)" />
  </div>
</template>
