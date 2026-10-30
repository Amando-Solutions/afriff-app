<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRightIcon, CheckIcon, ChevronLeftIcon, ClockIcon, NavigationIcon, PlusIcon, TicketIcon } from 'lucide-vue-next'
import { EVENT_TYPES, eventById, isAfcm, isMultiDay, speakerNames } from '@afriff/core/data/events'
import { venueById } from '@afriff/core/data/programme'
import { dateParts, directionsUrl, initials, timeLabel, toMinutes } from '@afriff/core/utils/format'
import { useFestival } from '~/lib/store'

// EVENT PAGE: masterclasses, workshops, market days and AFCM sessions, galas, parties.
const route = useRoute()
const router = useRouter()
const event = computed(() => eventById(String(route.params.id)))
useHead({ title: () => event.value?.title.split(':')[0] || 'Event' })
const { isScheduled, toggleScheduled } = useFestival()

// Everything the page shows that's worked out from the event (null when it doesn't exist)
const info = computed(() => {
  const e = event.value
  if (!e) return null
  const p = dateParts(e.date)
  const multi = isMultiDay(e)
  let mins = toMinutes(e.end) - toMinutes(e.time)
  if (mins <= 0) mins += 24 * 60 // runs past midnight
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return {
    type: EVENT_TYPES[e.type],
    multi,
    afcm: isAfcm(e),
    p,
    venue: e.venue ? venueById(e.venue) ?? null : null,
    duration: h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`,
    dayLine: multi && e.endDate ? `– ${String(dateParts(e.endDate).date).padStart(2, '0')} ${p.monthUpper}` : `${p.monthUpper} ${p.day.toUpperCase()}`,
  }
})

function back() {
  if (window.history.state?.back) router.back()
  else router.push('/programme/events')
}
</script>

<template>
  <div v-if="!event" class="page">
    <p class="empty">We couldn't find that event. <NuxtLink class="link" to="/programme/events">Back to events</NuxtLink></p>
  </div>

  <div v-else-if="info" :key="event.id" class="page film-page">
    <div class="film-topbar">
      <a href="/programme/events" class="pill-btn" @click.prevent="back"><ChevronLeftIcon :size="20" /> Back</a>
      <div class="film-topbar-right">
        <span class="pill-btn static">{{ info.type.label }}</span>
        <span class="pill-btn static"><ClockIcon :size="15" /> {{ info.duration }}</span>
      </div>
    </div>

    <!-- the whole graphic, never cropped (same frame as film posters) -->
    <div v-if="event.image" class="hero-poster has-image">
      <img :src="event.image" :alt="event.title" decoding="async" />
    </div>
    <div v-else class="event-hero">
      <EventThumb :event="event" class="event-hero-art" :size="56" />
      <span class="event-hero-type">{{ info.type.label }}</span>
    </div>

    <h1 class="film-title" :class="{ struck: event.status === 'cancelled' }">{{ event.title }}</h1>
    <StatusTag :status="event.status" />
    <p v-if="event.access" class="muted small"><TicketIcon :size="14" style="vertical-align: -2px" /> {{ event.access }}</p>

    <a v-if="event.link?.url" class="btn btn-gold event-cta" :href="event.link.url" target="_blank" rel="noopener noreferrer">
      {{ event.link.label || 'More on afriff.com' }} <ArrowUpRightIcon :size="18" />
    </a>

    <section v-if="event.about" class="section">
      <h2 class="section-title">About</h2>
      <p class="event-about">{{ event.about }}</p>
    </section>

    <!-- awards: show who decides the winners -->
    <JuryRow v-if="event.type === 'awards'" title="The jury" intro="These are the people choosing this year's Globe Award winners. Tap a face to read about them." />

    <section class="section">
      <h2 class="section-title">When &amp; where</h2>
      <div class="showtime event-when">
        <div class="showtime-card">
          <div class="showtime-date">
            <span class="big-num">{{ String(info.p.date).padStart(2, '0') }}</span>
            <span class="showtime-mon">{{ info.dayLine }}</span>
          </div>
          <span class="showtime-time">{{ info.multi ? 'Evenings from ' : '' }}{{ timeLabel(event.time) }} – {{ timeLabel(event.end) }}</span>
          <span class="venue-line"><VenueDot v-if="info.venue" :venue-id="info.venue.id" /> {{ info.venue ? info.venue.name : event.place }}</span>
          <span v-if="info.venue && event.place" class="muted small">{{ event.place }}</span>
          <span v-if="event.tag === 'Industry'" class="pill pill-alt">Industry</span>
        </div>
        <button
          v-if="!info.multi"
          type="button"
          class="btn-schedule"
          :class="{ added: isScheduled(event.id) }"
          :aria-pressed="isScheduled(event.id)"
          @click="toggleScheduled(event.id)"
        >
          <template v-if="isScheduled(event.id)"><CheckIcon :size="18" /> Scheduled</template>
          <template v-else><PlusIcon :size="18" /> Schedule</template>
        </button>
        <a v-if="info.venue" class="btn-schedule" :href="directionsUrl(info.venue.address)" target="_blank" rel="noopener noreferrer">
          <NavigationIcon :size="16" /> Directions
        </a>
      </div>
      <!-- AFCM sessions' times are from AFCM's own graphics -->
      <p v-if="!info.afcm" class="muted small" style="margin-top: 10px">Times and rooms are samples until AFRIFF publishes the schedule.</p>
    </section>

    <section v-if="event.speaker" class="section">
      <h2 class="section-title">With</h2>
      <!-- an AFCM panel: everyone on it, then who moderates -->
      <template v-if="info.afcm">
        <SpeakerFaces :names="speakerNames(event)" list />
        <p v-if="event.speakerRole" class="muted small" style="margin-top: 10px">{{ event.speakerRole }}</p>
      </template>
      <div v-else class="speaker">
        <div class="initials-tile">{{ initials(event.speaker.replace(/\(.*\)/, '')) }}</div>
        <div class="speaker-text">
          <span class="director-name">{{ event.speaker }}</span>
          <span v-if="event.speakerRole" class="muted small">{{ event.speakerRole }}</span>
          <p v-if="event.bio" class="speaker-bio">{{ event.bio }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
