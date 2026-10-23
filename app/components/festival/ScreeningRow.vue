<script setup>
import { computed } from 'vue'
import { filmById } from '~/data/programme.js'
import { time12 } from '~/lib/format.js'
import { queueAt } from '~/lib/queues.js'
import { useFestival } from '~/lib/store.js'

// One schedule row: big time, title, venue, live queue, section, poster, +.
const props = defineProps({ screening: { type: Object, required: true }, clock: { type: Number, default: 0 } })
const { isScheduled, toggleScheduled } = useFestival()
const film = computed(() => filmById(props.screening.film))
const t = computed(() => time12(props.screening.time))
const queue = computed(() => queueAt(props.screening, props.clock || undefined))
</script>

<template>
  <div class="flex items-center gap-3 border-b border-line py-3.5">
    <NuxtLink :to="`/film/${film.id}`" class="flex min-w-0 flex-1 items-start gap-3">
      <div class="w-14 shrink-0 tabular-nums">
        <span class="block font-display text-h2 leading-none font-semibold text-accent-ink">{{ t.time }}</span>
        <span class="mt-1 block text-micro font-semibold text-muted">{{ t.ampm }}</span>
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <span class="line-clamp-2 text-body font-semibold" :class="screening.status === 'cancelled' && 'text-muted line-through'">{{ film.title }}</span>
        <VenueLine :venue-id="screening.venue"><StatusTag :status="screening.status" /></VenueLine>
        <QueueTag v-if="queue" :queue="queue" />
        <span class="text-micro font-semibold tracking-wider text-subtle uppercase">{{ film.section }}{{ screening.tag === 'Industry' ? ' · Industry' : '' }}</span>
      </div>
      <FilmPoster :film="film" class="aspect-[2/3] w-12 rounded-thumb" />
    </NuxtLink>
    <AddButton :added="isScheduled(screening.id)" :title="film.title" @toggle="toggleScheduled(screening.id)" />
  </div>
</template>
