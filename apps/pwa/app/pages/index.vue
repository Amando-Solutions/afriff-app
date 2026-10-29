<script setup lang="ts">
import { computed, ref } from 'vue'
import { AwardIcon, ChevronRightIcon, GraduationCapIcon, MapPinIcon, TicketIcon } from 'lucide-vue-next'
import { FESTIVAL, SCREENINGS, filmById, venueById } from '@afriff/core/data/programme'
import { EVENTS, EVENT_TYPES, isMultiDay } from '@afriff/core/data/events'
import { dateParts, queueLabel, timeLabel } from '@afriff/core/utils/format'
import { queueAt, useLiveClock } from '~/lib/queues'
import { lagosDate } from '@afriff/core/utils/now'
import { dayInfo, festivalPhase, venueShort, type UpcomingItem } from '~/lib/today'
import type { FestivalEvent, Film, ItemStatus, Screening } from '@afriff/core/types/festival'
import { openProgrammeDay } from '~/lib/programmeMemory'
import { useFestival } from '~/lib/store'
import keyArt from '~/assets/images/home-keyart.jpg'

// HOME, kept simple: the bottom bar already reaches Programme, Queues and
// My Festival, so Home only shows the hero, shortcuts to the things the
// bottom bar doesn't reach, a taste of the day, events and sponsors.
// (The urgent alert is under the header on every page: AlertBanner.vue.)
// Hero laid out like the designer's screens (afriff-screens-html/afriff-home-*.html)
// in the app's own look: before the festival the key art, headline, opening
// night film and countdown; 1–7 Nov the daily highlight (DailyHighlight.vue).
useHead({ title: 'AFRIFF 2026' })

const { isScheduled, toggleScheduled } = useFestival()
const t = useLiveClock(60000) // redraw every minute: "Next up" and Today move on
const phase = computed(() => festivalPhase(t.value))
const today = computed(() => lagosDate(new Date(t.value)))

// ---------- Countdown to opening night (Countdown ticks every second) ----------
const openingAt = new Date(FESTIVAL.openingNight).getTime()
const openingStarted = computed(() => t.value >= openingAt)

// ---------- Opening night film: the Opening Movie's first-day screening ----------
const openingFilm = computed(() => {
  const s = SCREENINGS.filter((x) => x.date === FESTIVAL.days[0] && x.status !== 'cancelled' && filmById(x.film)?.section === 'Opening Movie')
    .sort((a, b) => b.time.localeCompare(a.time))[0] // the evening one, if it plays twice
  const film = s && filmById(s.film)
  if (!s || !film) return null
  const p = dateParts(s.date)
  return { film, when: `${p.day} ${p.date} ${p.month} · ${timeLabel(s.time)}`, venue: venueById(s.venue)?.name || '' }
})

// ---------- Shortcuts to things the bottom bar doesn't reach ----------
const howTo = ref(false)
const NuxtLink = resolveComponent('NuxtLink')
const shortcuts = [
  { label: 'Venues', icon: MapPinIcon, to: '/venues' },
  { label: 'How to attend', icon: TicketIcon, action: () => { howTo.value = true } },
  { label: 'Events', icon: GraduationCapIcon, to: '/programme/events' },
  { label: 'Jury', icon: AwardIcon, to: '/jury' },
]

// ---------- Opening day (before) / Today (during) ----------
const openingDay = FESTIVAL.days[0]!
const openingList = computed(() => {
  // the opening film always makes the cut, then the rest of the day; shown in time order
  const opening = (s: Screening) => (filmById(s.film)?.section === 'Opening Movie' ? 0 : 1)
  return SCREENINGS.filter((s) => s.date === openingDay)
    .sort((a, b) => opening(a) - opening(b) || a.time.localeCompare(b.time))
    .slice(0, 4)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((s): UpcomingItem => ({ kind: 'screening', item: s, at: 0 }))
})
const todayInfo = computed(() => (phase.value === 'during' ? dayInfo(today.value, t.value) : null))
const dayRows = computed(() => (todayInfo.value ? todayInfo.value.upcoming.slice(0, 4) : openingList.value))
const dayHeading = computed(() => {
  const p = dateParts(phase.value === 'during' ? today.value : openingDay)
  return { title: phase.value === 'during' ? 'Today' : 'Opening day', meta: `${p.day} ${p.date} ${p.month}` }
})

interface DayRow {
  id: string
  to: string
  title: string
  film?: Film
  event?: FestivalEvent
  status?: ItemStatus
  meta: string
  full: boolean
}
function rowInfo(x: UpcomingItem): DayRow {
  if (x.kind === 'screening') {
    const s = x.item
    const film = filmById(s.film)
    return {
      id: s.id, to: `/film/${s.film}`, title: film?.title ?? '', film, status: s.status,
      meta: `${timeLabel(s.time)} · ${venueShort(s.venue)}`,
      full: queueLabel(queueAt(s))?.text === 'Full',
    }
  }
  const e = x.item
  return {
    id: e.id, to: `/event/${e.id}`, title: e.title.split(':')[0] ?? e.title, event: e, status: e.status,
    meta: [timeLabel(e.time), e.venue ? venueShort(e.venue) : e.place].filter(Boolean).join(' · '), full: false,
  }
}

// ---------- Masterclasses first (free, registration needed), then the big festival moments ----------
const strip = computed(() => {
  const byTime = (a: FestivalEvent, b: FestivalEvent) => (a.date + a.time).localeCompare(b.date + b.time)
  const learn = EVENTS.filter((e) => EVENT_TYPES[e.type].group === 'learn').sort(byTime)
  const other = EVENTS.filter((e) => EVENT_TYPES[e.type].group !== 'learn' && !isMultiDay(e) && e.type !== 'market').sort(byTime)
  return [...learn, ...other]
})
</script>

<template>
  <div class="page">
    <!-- Before the festival: key art, headline, opening night film, countdown -->
    <section v-if="phase === 'before'" class="hero">
      <img :src="keyArt" alt="" class="hero-art" decoding="async" />
      <p class="hero-eyebrow">1–7 November 2026</p>
      <h2 class="hero-title">Seven days of <span>African stories</span> on the big screen</h2>

      <NuxtLink v-if="openingFilm" :to="`/film/${openingFilm.film.id}`" class="opening-film">
        <FilmPoster :film="openingFilm.film" class="poster-opening" />
        <span class="opening-film-text">
          <span class="hero-eyebrow">Opening night film</span>
          <span class="opening-film-title">{{ openingFilm.film.title }}</span>
          <span class="opening-film-meta">
            {{ openingFilm.when }}<template v-if="openingFilm.venue"><br />{{ openingFilm.venue }}</template><template v-if="openingFilm.film.director"><br />Dir. {{ openingFilm.film.director }}</template>
          </span>
          <span class="opening-film-more">About the film →</span>
        </span>
      </NuxtLink>

      <div v-if="!openingStarted" class="countdown">
        <span class="countdown-label">Opening night starts in</span>
        <Countdown :to="openingAt" days label="Opening night starts in" />
      </div>
      <NuxtLink to="/programme" class="btn btn-gold hero-cta">See the programme</NuxtLink>
    </section>

    <!-- 1–7 Nov: the daily highlight -->
    <DailyHighlight v-else-if="phase === 'during'" :day="today" :t="t" />

    <!-- After 7 Nov: thank you -->
    <section v-else class="hero">
      <p class="hero-eyebrow">AFRIFF 2026 · That's a wrap</p>
      <h2 class="hero-title">Thank you for seven days of African stories</h2>
      <p class="hero-sub" style="margin-top: 12px">Rate the films you saw and export them to Letterboxd.</p>
      <NuxtLink to="/my" class="btn btn-gold hero-cta">Your watched list</NuxtLink>
    </section>

    <!-- Things the bottom bar doesn't reach, one word each -->
    <nav class="shortcuts" aria-label="Shortcuts">
      <component
        :is="s.to ? NuxtLink : 'button'"
        v-for="s in shortcuts"
        :key="s.label"
        :to="s.to"
        :type="s.to ? undefined : 'button'"
        class="shortcut"
        @click="s.action?.()"
      >
        <span class="shortcut-icon"><component :is="s.icon" :size="22" :stroke-width="1.8" /></span>
        <span class="shortcut-label">{{ s.label }}</span>
      </component>
    </nav>
    <HowToAttendSheet v-model:open="howTo" />

    <!-- Opening day (before) / Today (during) -->
    <section v-if="phase !== 'after'" class="section">
      <div class="section-head">
        <h2 class="section-title">{{ dayHeading.title }} <span class="section-date">{{ dayHeading.meta }}</span></h2>
        <NuxtLink to="/programme" class="link" @click="phase === 'during' && openProgrammeDay(today)">See all <ChevronRightIcon :size="18" /></NuxtLink>
      </div>
      <p v-if="phase === 'during' && dayRows.length === 0" class="muted">
        Nothing else starts today.
        <NuxtLink v-if="todayInfo?.tomorrow" to="/programme" class="link gold-link" @click="openProgrammeDay(todayInfo.tomorrow)">See tomorrow</NuxtLink>
      </p>
      <div v-else class="home-rows">
        <div v-for="x in dayRows.map(rowInfo)" :key="x.id" class="home-row">
          <NuxtLink :to="x.to" class="home-row-link">
            <FilmPoster v-if="x.film" :film="x.film" class="poster-mini" />
            <EventThumb v-else-if="x.event" :event="x.event" class="poster-mini" :size="18" />
            <span class="home-row-text">
              <span class="home-row-title" :class="{ struck: x.status === 'cancelled' }">{{ x.title }}</span>
              <span class="home-row-meta">
                {{ x.meta }}<span v-if="x.full" class="full"> · Full</span>
                <StatusTag :status="x.status" />
              </span>
            </span>
          </NuxtLink>
          <AddButton :added="isScheduled(x.id)" :title="x.title" @toggle="toggleScheduled(x.id)" />
        </div>
      </div>
    </section>

    <!-- Masterclasses first (free, registration needed), then the big festival moments -->
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Masterclasses &amp; events</h2>
        <NuxtLink to="/programme/events" class="link">See all <ChevronRightIcon :size="18" /></NuxtLink>
      </div>
      <div class="event-strip">
        <EventCard v-for="e in strip" :key="e.id" :event="e" />
      </div>
    </section>

    <section class="section sponsors">
      <p class="eyebrow">Supported by</p>
      <SponsorMarquee variant="strip" />
    </section>
  </div>
</template>
