<script setup lang="ts">
import type { FestivalEvent } from '@afriff/core/types/festival'
import { computed } from 'vue'
import { isMultiDay } from '@afriff/core/data/events'
import { dateParts } from '@afriff/core/utils/format'

// Poster-style card used in the Home strip: graphic (or colour tile), short title, day
const props = defineProps<{ event: FestivalEvent }>()
const when = computed(() => {
  if (isMultiDay(props.event)) return 'All week'
  const p = dateParts(props.event.date)
  return `${p.day} ${p.date} ${p.month}`
})
</script>

<template>
  <NuxtLink :to="`/event/${event.id}`" class="event-card">
    <EventThumb :event="event" class="event-card-art" :size="30" />
    <span class="event-card-title">{{ event.title.split(':')[0] }}</span>
    <span class="event-card-when">{{ when }}</span>
  </NuxtLink>
</template>
