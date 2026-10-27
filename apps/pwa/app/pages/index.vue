<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { AwardIcon, ChevronRightIcon, GraduationCapIcon, MapPinIcon, TicketIcon, TriangleAlertIcon, XIcon } from 'lucide-vue-next'
import { activeBanner, newsLink } from '~/lib/alerts'
import { FESTIVAL, SCREENINGS, filmById } from '@afriff/core/data/programme'
import { EVENTS, EVENT_TYPES, isMultiDay } from '@afriff/core/data/events'
import { dateParts, queueLabel, timeLabel } from '@afriff/core/utils/format'
import { queueAt, useLiveClock } from '~/lib/queues'
import { lagosDate, now as clockNow } from '@afriff/core/utils/now'
import { dayInfo, festivalPhase, venueShort, type UpcomingItem } from '~/lib/today'
import type { FestivalEvent, Film, ItemStatus, Screening } from '@afriff/core/types/festival'
import { openProgrammeDay } from '~/lib/programmeMemory'
import { useFestival } from '~/lib/store'

// HOME, kept simple: the bottom bar already reaches Programme, Queues and
// My Festival, so Home only shows the banner, shortcuts to the things the
// bottom bar doesn't reach, a taste of the day, events and sponsors.
useHead({ title: 'AFRIFF 2026' })

const { isScheduled, toggleScheduled } = useFestival()
const t = useLiveClock(60000) // redraw every minute: "Next up" and Today move on
const phase = computed(() => festivalPhase(t.value))
const today = computed(() => lagosDate(new Date(t.value)))

// ---------- Urgent news banner ----------
const bannerHidden = ref(false)
const urgent = computed(() => activeBanner())
const urgentLink = computed(() => (urgent.value ? newsLink(urgent.value) : null))
const urgentTitle = computed(() => {
  const title = urgent.value?.title || ''
  return /[.!?:]$/.test(title) ? title : `${title}.`
})

// ---------- Countdown (d / h / m, no seconds) ----------
const nowMs = ref(clockNow().getTime())
const tick = setInterval(() => { nowMs.value = clockNow().getTime() }, 1000)
onBeforeUnmount(() => clearInterval(tick))
const countdown = computed(() => {
  const diff = Math.max(0, new Date(FESTIVAL.openingNight).getTime() - nowMs.value)
  const sec = Math.floor(diff / 1000)
  return {
    days: Math.floor(sec / 86400),
    hours: Math.floor((sec % 86400) / 3600),
    mins: Math.floor((sec % 3600) / 60),
    done: diff === 0,
  }
})
const pad = (n: number) => String(n).padStart(2, '0')
const units = computed(() => [{ n: countdown.value.days, l: 'd' }, { n: countdown.value.hours, l: 'h' }, { n: countdown.value.mins, l: 'm' }])

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
    <!-- Urgent news (newest urgent alert that hasn't passed its "show until" time) -->
    <div v-if="urgent && !bannerHidden" class="news-banner" role="status">
      <TriangleAlertIcon :size="20" class="news-banner-icon" />
      <NuxtLink :to="urgentLink?.href || '/news'" class="news-banner-text">
        <strong>{{ urgentTitle }}</strong> {{ urgent.body }}
        <span v-if="urgentLink" class="news-banner-cta"> {{ urgentLink.label }} →</span>
      </NuxtLink>
      <button type="button" class="icon-btn" aria-label="Dismiss" @click="bannerHidden = true">
        <XIcon :size="18" />
      </button>
    </div>

    <!-- Before the festival: countdown -->
    <section v-if="phase === 'before'" class="hero">
      <p class="hero-eyebrow">1–7 Nov 2026 · Lagos</p>
      <h2 class="hero-title">Seven days of African stories on the big screen</h2>
      <p v-if="countdown.done" class="hero-sub">The festival is on. Enjoy the films!</p>
      <div v-else class="countdown" :aria-label="`Opening night in ${countdown.days} days, ${countdown.hours} hours and ${countdown.mins} minutes`">
        <span class="countdown-label">Opening night in</span>
        <span v-for="u in units" :key="u.l" class="count-box" aria-hidden="true">
          <span class="count-n">{{ pad(u.n) }}</span>
          <span class="count-l">{{ u.l }}</span>
        </span>
      </div>
      <NuxtLink to="/programme" class="btn btn-gold hero-cta">Explore the programme</NuxtLink>
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
