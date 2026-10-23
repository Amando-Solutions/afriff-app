<script setup lang="ts">
import { computed } from 'vue'
import type { Screening } from '~/types/festival'
import { filmById } from '~/data/programme'
import { queueAt } from '~/lib/queues'
import { useFestival } from '~/lib/store'

// One schedule row. Reading order: time → title → where → live queue → section,
// with the poster and the + at the edge.
const props = withDefaults(defineProps<{ screening: Screening; clock?: number }>(), { clock: 0 })
const { isScheduled, toggleScheduled } = useFestival()
const film = computed(() => filmById(props.screening.film))
const queue = computed(() => queueAt(props.screening, props.clock || undefined))
const cancelled = computed(() => props.screening.status === 'cancelled')
</script>

<template>
  <div v-if="film" class="flex items-center gap-3 border-b border-line py-3.5">
    <NuxtLink :to="`/film/${film.id}`" class="flex min-w-0 flex-1 items-start gap-3" :class="cancelled && 'opacity-60'">
      <RowTime :time="screening.time" />
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="line-clamp-2 text-body font-semibold" :class="cancelled && 'line-through'">{{ film.title }}</span>
        <VenueLine :venue-id="screening.venue"><StatusTag :status="screening.status" /></VenueLine>
        <QueueTag v-if="queue" :queue="queue" class="mt-0.5" />
        <span class="eyebrow mt-1 text-subtle">{{ film.section }}{{ screening.tag === 'Industry' ? ' · Industry' : '' }}</span>
      </div>
      <FilmPoster :film="film" class="aspect-[2/3] w-12 rounded-thumb" />
    </NuxtLink>
    <AddButton :added="isScheduled(screening.id)" :title="film.title" @toggle="toggleScheduled(screening.id)" />
  </div>
</template>
