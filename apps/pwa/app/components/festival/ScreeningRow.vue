<script setup lang="ts">
import { computed } from 'vue'
import type { Screening } from '@afriff/core/types/festival'
import { filmById, venueById } from '@afriff/core/data/programme'
import { time12 } from '@afriff/core/utils/format'
import { queueAt } from '~/lib/queues'
import { useFestival } from '~/lib/store'

// One schedule row: big time, title in capitals, venue, live queue, section,
// poster, and the round + to add it to My Festival.
const props = withDefaults(defineProps<{ screening: Screening; clock?: number }>(), { clock: 0 })
const { isScheduled, toggleScheduled } = useFestival()
const film = computed(() => filmById(props.screening.film))
const venue = computed(() => venueById(props.screening.venue))
const queue = computed(() => queueAt(props.screening, props.clock || undefined))
const t = computed(() => time12(props.screening.time))
</script>

<template>
  <div v-if="film" class="row">
    <NuxtLink :to="`/film/${film.id}`" class="row-link">
      <div class="row-time">
        <span class="row-time-n">{{ t.time }}</span>
        <span class="row-time-ampm">{{ t.ampm }}</span>
      </div>
      <div class="row-body">
        <span class="row-title" :class="{ struck: screening.status === 'cancelled' }">{{ film.title }}</span>
        <span class="venue-line"><VenueDot :venue-id="screening.venue" /> {{ venue?.name }} <StatusTag :status="screening.status" /></span>
        <QueueTag v-if="queue" :queue="queue" />
        <span class="row-cat">{{ film.section }}{{ screening.tag === 'Industry' ? ' · Industry' : '' }}</span>
      </div>
      <FilmPoster :film="film" class="poster-thumb" />
    </NuxtLink>
    <AddButton :added="isScheduled(screening.id)" :title="film.title" @toggle="toggleScheduled(screening.id)" />
  </div>
</template>
