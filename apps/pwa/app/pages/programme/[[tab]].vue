<script setup lang="ts">
import type { Component } from 'vue'
import type { FestivalEvent } from '@afriff/core/types/festival'
import { computed, onMounted, ref } from 'vue'
import {
  AwardIcon, BarChart3Icon, CalendarDaysIcon, CheckIcon, ChevronRightIcon, ClapperboardIcon, EyeIcon, FilmIcon, ListChecksIcon,
  ListIcon, MapPinIcon, SearchIcon, SparklesIcon,
} from 'lucide-vue-next'
import { FESTIVAL, FILMS, SCREENINGS, SECTIONS } from '@afriff/core/data/programme'
import { EVENTS, EVENT_FILTERS, EVENT_TYPES, eventsOn, isAfcm, isMultiDay } from '@afriff/core/data/events'
import { dateParts } from '@afriff/core/utils/format'
import { lagosDate } from '@afriff/core/utils/now'
import { dayItems, type DayItemType } from '~/lib/dayItems'
import { planForDay } from '~/lib/plan'
import { venuePlace } from '~/lib/today'
import { openProgrammeDay, programmeMemory as memory } from '~/lib/programmeMemory'
import { useLiveClock } from '~/lib/queues'
import { useFestival } from '~/lib/store'

// PROGRAMME: Schedule (by day, list or timeline), All films, Events.
// /programme, /programme/films, /programme/events
const route = useRoute()
const router = useRouter()
const tab = computed(() => (route.params.tab === 'films' || route.params.tab === 'events' ? route.params.tab : 'schedule'))
useHead({ title: 'Programme' })
// /programme?day=2026-11-03 opens the Schedule on that day (links in "Share my day")
if (typeof route.query.day === 'string' && FESTIVAL.days.includes(route.query.day)) openProgrammeDay(route.query.day)
// /programme?type=afcm (Home's AFCM shortcut and tab) opens the Schedule on the AFCM
// sessions: on ?day= if given, else today's or the next day that has any
const afcmDays = [...new Set(EVENTS.filter(isAfcm).map((e) => e.date))].sort()
if (route.query.type === 'afcm' && afcmDays.length) {
  memory.type = 'afcm'
  memory.venues = []
  if (typeof route.query.day !== 'string') {
    const from = FESTIVAL.days.includes(lagosDate()) ? lagosDate() : FESTIVAL.days[0]!
    memory.day = afcmDays.find((d) => d >= from) ?? afcmDays[0] ?? memory.day
  }
}
// then tidy the address, so coming back from a film keeps the day and filter picked since
onMounted(() => {
  if (route.query.type || route.query.day) router.replace({ query: { ...route.query, type: undefined, day: undefined } })
})

const searching = ref(false)
const { state, isWatched, toggleWatched } = useFestival()
const clock = useLiveClock()

const TABS: { id: 'schedule' | 'films' | 'events'; label: string; to: string; icon: Component }[] = [
  { id: 'schedule', label: 'Schedule', to: '/programme', icon: CalendarDaysIcon },
  { id: 'films', label: 'All films', to: '/programme/films', icon: FilmIcon },
  { id: 'events', label: 'Events', to: '/programme/events', icon: SparklesIcon },
]

// ---------- Schedule ----------
const TAG_FILTERS = ['All', 'Public', 'Industry'] as const
const ALL_TYPES: { id: DayItemType; label: string }[] = [{ id: 'all', label: 'All' }, { id: 'films', label: 'Films' }, { id: 'events', label: 'Events' }, { id: 'afcm', label: 'AFCM' }]
// AFCM only once there are AFCM sessions in the data
const TYPE_FILTERS = ALL_TYPES.filter((f) => f.id !== 'afcm' || afcmDays.length > 0)
if (memory.type === 'afcm' && !afcmDays.length) memory.type = 'all'
const planOpen = ref(false)

// screenings and events for the day, one row per showing, in time order
const items = computed(() =>
  dayItems(memory.day, memory.type)
    .filter((i) => memory.venues.length === 0 || (i.venue && memory.venues.includes(i.venue)))
    .filter((i) => memory.tag === 'All' || i.tag === memory.tag),
)
const nFilms = computed(() => items.value.filter((i) => i.kind === 'screening').length)
const nEvents = computed(() => items.value.length - nFilms.value)
const plannedToday = computed(() => planForDay(state.scheduled, memory.day).length)
const eventsToday = computed(() => eventsOn(memory.day).length)
const nextTag = () => { memory.tag = TAG_FILTERS[(TAG_FILTERS.indexOf(memory.tag) + 1) % TAG_FILTERS.length]! }
const emptyWord = computed(() => (memory.tag === 'Public' ? 'public' : memory.tag === 'Industry' ? 'for industry' : 'showing'))
const s = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
// short enough to stay on one line on small phones
const countText = computed(() =>
  memory.type === 'films' ? s(nFilms.value, 'screening')
    : memory.type === 'events' ? s(nEvents.value, 'event')
      : memory.type === 'afcm' ? s(nEvents.value, 'session')
        : `${s(nFilms.value, 'film')} · ${s(nEvents.value, 'event')}`,
)

// "Mon 2 – Fri 6 Nov", the days with AFCM sessions
const afcmSpan = (() => {
  if (!afcmDays.length) return ''
  const first = dateParts(afcmDays[0]!)
  const last = dateParts(afcmDays[afcmDays.length - 1]!)
  return afcmDays.length === 1 ? `${first.day} ${first.date} ${first.month}` : `${first.day} ${first.date} – ${last.day} ${last.date} ${last.month}`
})()
// The AFCM card: what the market is, from its market-day records in the database
// (title, about, badge link: edited in the console). The day's record if it has
// one, else the first; shown without its " · Day N".
const markets = EVENTS.filter((e) => e.type === 'market').sort((a, b) => a.date.localeCompare(b.date))
const market = computed(() => markets.find((m) => m.date === memory.day) ?? markets[0] ?? null)
const marketName = computed(() => market.value?.title.replace(/\s*·\s*Day \d+$/i, '') ?? '')
const afcmFacts = [afcmSpan && `Sessions ${afcmSpan}`, venuePlace(EVENTS.find(isAfcm)?.venue)].filter(Boolean).join(' · ')

// ---------- All films ----------
const sections = computed(() => {
  const names = [...SECTIONS, ...new Set(FILMS.map((f) => f.section).filter((x) => !SECTIONS.includes(x)))]
  return names
    .map((name) => ({ name, films: FILMS.filter((f) => f.section === name).sort((a, b) => a.title.localeCompare(b.title)) }))
    .filter((x) => x.films.length)
})
const venuesOf = (filmId: string) => [...new Set(SCREENINGS.filter((x) => x.film === filmId).map((x) => x.venue))]

// ---------- Events ----------
const showEvent = (e: FestivalEvent) => memory.eventFilter === 'all' || EVENT_TYPES[e.type].group === memory.eventFilter
const allWeek = computed(() => EVENTS.filter((e) => isMultiDay(e) && showEvent(e)))
const eventDays = computed(() =>
  FESTIVAL.days.map((d) => ({ d, p: dateParts(d), list: eventsOn(d).filter(showEvent) })).filter((x) => x.list.length),
)
</script>

<template>
  <div class="page">
    <div class="title-row">
      <PageTitle title="Programme" :icon="ClapperboardIcon" />
      <button type="button" class="icon-btn big" aria-label="Search films, directors and events" @click="searching = true">
        <SearchIcon :size="24" />
      </button>
    </div>
    <div class="subtitle-row">
      <span>Full festival schedule</span>
      <NuxtLink to="/venues" class="underline-link"><MapPinIcon :size="18" /> Lagos</NuxtLink>
    </div>

    <div class="seg" role="tablist" aria-label="Programme view">
      <NuxtLink v-for="t in TABS" :key="t.id" :to="t.to" role="tab" :aria-selected="tab === t.id" :class="{ on: tab === t.id }">
        <component :is="t.icon" :size="18" /> {{ t.label }}
      </NuxtLink>
    </div>

    <!-- ===== Schedule ===== -->
    <template v-if="tab === 'schedule'">
      <DayPicker v-model="memory.day" />
      <VenueChips v-model="memory.venues" :day="memory.day" :type="memory.type" />

      <div class="type-filter" role="group" aria-label="Show">
        <button
          v-for="f in TYPE_FILTERS"
          :key="f.id"
          type="button"
          :aria-pressed="memory.type === f.id"
          class="chip small"
          :class="{ on: memory.type === f.id }"
          @click="memory.type = f.id"
        ><span v-if="f.id === 'afcm'" class="afcm-dot" />{{ f.label }}</button>
        <span class="muted type-count">{{ countText }}</span>
      </div>

      <div class="list-tools">
        <button type="button" class="chip small" :class="{ on: memory.tag !== 'All' }" @click="nextTag">
          {{ memory.tag === 'All' ? 'Public & Industry' : `${memory.tag} only` }}
        </button>
        <div class="toggle" role="group" aria-label="View">
          <button type="button" :class="{ on: memory.view === 'list' }" :aria-pressed="memory.view === 'list'" aria-label="List view" @click="memory.view = 'list'"><ListIcon :size="20" /></button>
          <button type="button" :class="{ on: memory.view === 'timeline' }" :aria-pressed="memory.view === 'timeline'" aria-label="Timeline view" @click="memory.view = 'timeline'"><BarChart3Icon :size="20" /></button>
        </div>
      </div>

      <div v-if="memory.type === 'afcm' && market" class="afcm-info">
        <NuxtLink :to="`/event/${market.id}`" class="afcm-info-title">{{ marketName }} <ChevronRightIcon :size="16" /></NuxtLink>
        <span v-if="market.about" class="afcm-info-about">{{ market.about }}</span>
        <span v-if="afcmFacts">{{ afcmFacts }}</span>
        <a v-if="market.link?.url" :href="market.link.url" target="_blank" rel="noopener noreferrer" class="link">{{ market.link.label || 'More about the market' }}</a>
      </div>
      <p v-if="items.length === 0 && memory.type === 'afcm'" class="empty">No AFCM sessions on this day.{{ afcmSpan ? ` They run ${afcmSpan}.` : '' }}</p>
      <p v-else-if="items.length === 0" class="empty">Nothing {{ emptyWord }} at these venues on this day.</p>
      <div v-else-if="memory.view === 'list'" class="rows">
        <template v-for="i in items" :key="i.id">
          <ScreeningRow v-if="i.kind === 'screening'" :screening="i.screening" :clock="clock" />
          <EventRow v-else :event="i.event" />
        </template>
      </div>
      <ProgrammeTimeline v-else :items="items" :day="memory.day" />

      <NuxtLink v-if="eventsToday > 0" to="/programme/events" class="events-pointer">
        <SparklesIcon :size="18" /> {{ eventsToday }} masterclass{{ eventsToday === 1 ? '' : 'es' }} &amp; event{{ eventsToday === 1 ? '' : 's' }} this day <span>See events →</span>
      </NuxtLink>
      <!-- extra bottom space so the floating My plan button never covers a row -->
      <p class="footnote" style="margin-bottom: 64px">Times can change. Check the bell for updates.</p>

      <button type="button" class="fab" @click="planOpen = true">
        <ListChecksIcon :size="20" /> My plan<span v-if="plannedToday > 0" class="fab-count">{{ plannedToday }}</span>
      </button>
      <MyPlanSheet v-model:open="planOpen" :day="memory.day" />
    </template>

    <!-- ===== All films ===== -->
    <div v-else-if="tab === 'films'" class="all-films">
      <NuxtLink to="/jury" class="jury-pointer">
        <AwardIcon :size="18" /> Competition films are judged by the International Jury <span>Meet the jury →</span>
      </NuxtLink>
      <section v-for="sec in sections" :key="sec.name" class="af-section">
        <h2 class="af-head">{{ sec.name }} <span class="af-count">{{ sec.films.length }}</span></h2>
        <div v-for="f in sec.films" :key="f.id" class="af-row">
          <NuxtLink :to="`/film/${f.id}`" class="af-link">
            <FilmPoster :film="f" class="poster-mini" />
            <span class="af-text">
              <span class="af-title">{{ f.title }}</span>
              <span class="muted small">{{ [f.director, f.country].filter(Boolean).join(' · ') }}</span>
            </span>
          </NuxtLink>
          <span class="af-dots" aria-label="Venues"><VenueDot v-for="v in venuesOf(f.id)" :key="v" :venue-id="v" /></span>
          <button
            type="button"
            class="eye-btn"
            :class="{ on: isWatched(f.id) }"
            :aria-pressed="isWatched(f.id)"
            :aria-label="isWatched(f.id) ? `Unmark ${f.title} as seen` : `Mark ${f.title} as seen`"
            @click="toggleWatched(f.id)"
          >
            <CheckIcon v-if="isWatched(f.id)" :size="20" :stroke-width="2.4" />
            <EyeIcon v-else :size="20" />
          </button>
        </div>
      </section>
    </div>

    <!-- ===== Events ===== -->
    <div v-else class="events-tab">
      <p class="muted small events-intro">Masterclasses, workshops, the AFCM market, galas and parties. Masterclasses are free; register on afriff.com.</p>
      <div class="chips" role="group" aria-label="Event type">
        <button
          v-for="f in EVENT_FILTERS"
          :key="f.id"
          type="button"
          :aria-pressed="memory.eventFilter === f.id"
          class="chip"
          :class="{ on: memory.eventFilter === f.id }"
          @click="memory.eventFilter = f.id"
        >{{ f.label }}</button>
      </div>
      <section v-if="allWeek.length" class="ev-day">
        <h2 class="ev-day-head">All week</h2>
        <EventRow v-for="e in allWeek" :key="e.id" :event="e" />
      </section>
      <section v-for="x in eventDays" :key="x.d" class="ev-day">
        <h2 class="ev-day-head">{{ x.p.day }} {{ x.p.date }} {{ x.p.month }}</h2>
        <EventRow v-for="e in x.list" :key="e.id" :event="e" />
      </section>
      <p class="footnote" style="margin-bottom: 24px">Times and rooms are samples until AFRIFF publishes the schedule.</p>
    </div>

    <ProgrammeSearch v-model:open="searching" />
  </div>
</template>
