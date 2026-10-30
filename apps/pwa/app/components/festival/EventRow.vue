<script setup lang="ts">
import { computed } from 'vue'
import type { FestivalEvent } from '@afriff/core/types/festival'
import { EVENT_TYPES, isAfcm, isMultiDay, speakerNames } from '@afriff/core/data/events'
import { time12, timeLabel } from '@afriff/core/utils/format'
import { eventWhere } from '~/lib/eventLook'
import { useFestival } from '~/lib/store'

// An event in a schedule list: same layout as a screening row. AFCM sessions
// show their speakers as faces and a violet label. `live` = on now (Home's AFCM tab).
const props = defineProps<{ event: FestivalEvent; live?: boolean }>()
const { isScheduled, toggleScheduled } = useFestival()
const multi = computed(() => isMultiDay(props.event))
const t = computed(() => time12(props.event.time))
const afcm = computed(() => isAfcm(props.event))
</script>

<template>
  <div class="row">
    <NuxtLink :to="`/event/${event.id}`" class="row-link">
      <div class="row-time">
        <template v-if="multi">
          <span class="row-time-n small">Nightly</span><span class="row-time-ampm">{{ timeLabel(event.time) }}</span>
        </template>
        <template v-else>
          <span class="row-time-n">{{ t.time }}</span><span class="row-time-ampm">{{ t.ampm }}</span>
        </template>
      </div>
      <div class="row-body">
        <span v-if="live" class="row-live"><span class="pulse" /> On now</span>
        <span class="row-title" :class="{ struck: event.status === 'cancelled', clamp2: afcm }">{{ event.title }}</span>
        <SpeakerFaces v-if="afcm" :names="speakerNames(event)" />
        <span v-else-if="event.speaker" class="event-speaker">with {{ event.speaker }}</span>
        <span class="venue-line"><VenueDot v-if="event.venue" :venue-id="event.venue" /> {{ eventWhere(event) }} <StatusTag :status="event.status" /></span>
        <span class="row-cat" :class="afcm ? 'afcm' : 'gold'">{{ EVENT_TYPES[event.type].label }}{{ event.access?.startsWith('Free') ? ' · Free' : '' }}</span>
      </div>
      <EventThumb :event="event" class="poster-thumb" />
    </NuxtLink>
    <span v-if="multi" class="row-spacer" />
    <AddButton v-else :added="isScheduled(event.id)" :title="event.title" @toggle="toggleScheduled(event.id)" />
  </div>
</template>
