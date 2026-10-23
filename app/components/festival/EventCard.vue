<script setup>
import { computed } from 'vue'
import { isMultiDay } from '~/data/events.js'
import { dateParts } from '~/lib/format.js'

// Poster-style card used in the Home strip: graphic (or colour tile), short title, day
const props = defineProps({ event: { type: Object, required: true } })
const when = computed(() => {
  if (isMultiDay(props.event)) return 'All week'
  const p = dateParts(props.event.date)
  return `${p.day} ${p.date} ${p.month}`
})
</script>

<template>
  <NuxtLink :to="`/event/${event.id}`" class="card card-interactive flex w-36 shrink-0 snap-start flex-col overflow-hidden">
    <EventThumb :event="event" icon-size="size-7" class="aspect-[4/5] w-full" />
    <span class="flex flex-1 flex-col gap-0.5 p-2.5">
      <span class="line-clamp-2 text-meta leading-snug font-semibold">{{ event.title.split(':')[0] }}</span>
      <span class="text-label text-muted">{{ when }}</span>
    </span>
  </NuxtLink>
</template>
