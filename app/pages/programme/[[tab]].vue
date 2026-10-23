<script setup>
import { computed, ref } from 'vue'
import {
  AwardIcon, CalendarDaysIcon, ChartNoAxesGanttIcon, CheckIcon, ClapperboardIcon, EyeIcon, FilmIcon, ListChecksIcon,
  ListIcon, MapPinIcon, SearchIcon, SparklesIcon,
} from 'lucide-vue-next'
import { FESTIVAL, FILMS, SCREENINGS, SECTIONS } from '~/data/programme.js'
import { EVENTS, EVENT_FILTERS, EVENT_TYPES, eventsOn, isMultiDay } from '~/data/events.js'
import { dateParts } from '~/lib/format.js'
import { dayItems } from '~/lib/dayItems.js'
import { planForDay } from '~/lib/plan.js'
import { programmeMemory as memory } from '~/lib/programmeMemory.js'
import { useLiveClock } from '~/lib/queues.js'
import { useFestival } from '~/lib/store.js'

// PROGRAMME: Schedule (by day, list or timeline), All films, Events.
// /programme, /programme/films, /programme/events
const route = useRoute()
const tab = computed(() => (route.params.tab === 'films' || route.params.tab === 'events' ? route.params.tab : 'schedule'))
useHead({ title: 'Programme' })

const searching = ref(false)
const { state, isWatched, toggleWatched } = useFestival()
const clock = useLiveClock()

const TABS = [
  { id: 'schedule', label: 'Schedule', to: '/programme', icon: CalendarDaysIcon },
  { id: 'films', label: 'All films', to: '/programme/films', icon: FilmIcon },
  { id: 'events', label: 'Events', to: '/programme/events', icon: SparklesIcon },
]

// ---------- Schedule ----------
const TAG_FILTERS = ['All', 'Public', 'Industry']
const TYPE_FILTERS = [{ id: 'all', label: 'All' }, { id: 'films', label: 'Films' }, { id: 'events', label: 'Events' }]
const VIEWS = [{ value: 'list', label: 'List view', icon: ListIcon }, { value: 'timeline', label: 'Timeline view', icon: ChartNoAxesGanttIcon }]
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
const nextTag = () => { memory.tag = TAG_FILTERS[(TAG_FILTERS.indexOf(memory.tag) + 1) % TAG_FILTERS.length] }
const emptyWord = computed(() => (memory.tag === 'Public' ? 'public' : memory.tag === 'Industry' ? 'for industry' : 'showing'))
const s = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
// short enough to stay on one line on small phones
const countText = computed(() =>
  memory.type === 'films' ? s(nFilms.value, 'screening')
    : memory.type === 'events' ? s(nEvents.value, 'event')
      : `${s(nFilms.value, 'film')} · ${s(nEvents.value, 'event')}`,
)

// ---------- All films ----------
const sections = computed(() => {
  const names = [...SECTIONS, ...new Set(FILMS.map((f) => f.section).filter((x) => !SECTIONS.includes(x)))]
  return names
    .map((name) => ({ name, films: FILMS.filter((f) => f.section === name).sort((a, b) => a.title.localeCompare(b.title)) }))
    .filter((x) => x.films.length)
})
const venuesOf = (filmId) => [...new Set(SCREENINGS.filter((x) => x.film === filmId).map((x) => x.venue))]

// ---------- Events ----------
const showEvent = (e) => memory.eventFilter === 'all' || EVENT_TYPES[e.type].group === memory.eventFilter
const allWeek = computed(() => EVENTS.filter((e) => isMultiDay(e) && showEvent(e)))
const eventDays = computed(() =>
  FESTIVAL.days.map((d) => ({ d, p: dateParts(d), list: eventsOn(d).filter(showEvent) })).filter((x) => x.list.length),
)
</script>

<template>
  <div>
    <PageTitle title="Programme" :icon="ClapperboardIcon">
      <template #actions>
        <button
          type="button"
          class="pressable grid size-10 place-items-center rounded-full border border-line bg-surface text-accent-ink shadow-card"
          aria-label="Search films, directors and events"
          @click="searching = true"
        >
          <SearchIcon class="size-5" />
        </button>
      </template>
    </PageTitle>
    <div class="mt-1 flex items-center justify-between text-muted">
      <span>Full festival schedule</span>
      <NuxtLink to="/venues" class="inline-flex items-center gap-1 text-meta font-medium text-ink underline decoration-accent decoration-2 underline-offset-4">
        <MapPinIcon class="size-4 text-accent-ink" /> Lagos
      </NuxtLink>
    </div>

    <nav role="tablist" aria-label="Programme view" class="mt-4 mb-4 inline-flex rounded-full bg-raised p-0.5">
      <NuxtLink
        v-for="t in TABS"
        :key="t.id"
        :to="t.to"
        role="tab"
        :aria-selected="tab === t.id"
        class="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-meta font-medium transition-[background-color,color,box-shadow] duration-200 ease-out"
        :class="tab === t.id ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(2_4_20/0.12),0_0_0_1px_var(--c-line)]' : 'text-muted hover:text-ink'"
      >
        <component :is="t.icon" class="size-4" :class="tab === t.id && 'text-accent-ink'" aria-hidden="true" />
        {{ t.label }}
      </NuxtLink>
    </nav>

    <!-- ===== Schedule ===== -->
    <template v-if="tab === 'schedule'">
      <DayPicker v-model="memory.day" />
      <div class="mt-3"><VenueChips v-model="memory.venues" :day="memory.day" :type="memory.type" /></div>

      <div role="group" aria-label="Show" class="mt-3 flex items-center gap-1.5">
        <UiChip v-for="t in TYPE_FILTERS" :key="t.id" small :on="memory.type === t.id" @click="memory.type = t.id">{{ t.label }}</UiChip>
        <span class="ml-auto text-label text-muted tabular-nums">{{ countText }}</span>
      </div>

      <div class="-mx-4 mt-3 flex items-center justify-between gap-2 border-b border-line px-4 pb-3">
        <UiChip small :on="memory.tag !== 'All'" @click="nextTag">{{ memory.tag === 'All' ? 'Public & Industry' : `${memory.tag} only` }}</UiChip>
        <UiToggle v-model="memory.view" :options="VIEWS" />
      </div>

      <p v-if="items.length === 0" class="py-8 text-center text-muted">Nothing {{ emptyWord }} at these venues on this day.</p>
      <div v-else-if="memory.view === 'list'">
        <template v-for="i in items" :key="i.id">
          <ScreeningRow v-if="i.kind === 'screening'" :screening="i.screening" :clock="clock" />
          <EventRow v-else :event="i.event" />
        </template>
      </div>
      <ProgrammeTimeline v-else :items="items" :day="memory.day" />

      <NuxtLink v-if="eventsToday > 0" to="/programme/events" class="card card-interactive mt-4 flex items-center gap-2.5 p-3 text-meta">
        <SparklesIcon class="size-[1.125rem] shrink-0 text-accent-ink" />
        <span class="flex-1">{{ eventsToday }} masterclass{{ eventsToday === 1 ? '' : 'es' }} & event{{ eventsToday === 1 ? '' : 's' }} this day</span>
        <span class="font-medium text-accent-ink">See events →</span>
      </NuxtLink>
      <!-- extra bottom space so the floating My plan button never covers a row -->
      <p class="mt-5 mb-16 text-center text-label text-subtle">Times can change. Check the bell for updates.</p>

      <button
        type="button"
        class="pressable fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] z-30 inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface pr-4 pl-3.5 text-meta font-semibold shadow-pop min-[37rem]:right-[calc(50%-17rem)]"
        @click="planOpen = true"
      >
        <ListChecksIcon class="size-[1.125rem] text-accent-ink" /> My plan
        <span v-if="plannedToday > 0" class="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-micro font-semibold text-on-accent tabular-nums">{{ plannedToday }}</span>
      </button>
      <MyPlanSheet v-model:open="planOpen" :day="memory.day" />
    </template>

    <!-- ===== All films ===== -->
    <template v-else-if="tab === 'films'">
      <NuxtLink to="/jury" class="card card-interactive flex items-center gap-2.5 p-3 text-meta">
        <AwardIcon class="size-[1.125rem] shrink-0 text-accent-ink" />
        <span class="flex-1">Competition films are judged by the International Jury</span>
        <span class="shrink-0 font-medium text-accent-ink">Meet the jury →</span>
      </NuxtLink>
      <section v-for="sec in sections" :key="sec.name" class="mt-7">
        <h2 class="mb-1 flex items-baseline gap-2 font-display text-h2 font-semibold">{{ sec.name }} <span class="text-label font-normal text-muted tabular-nums">{{ sec.films.length }}</span></h2>
        <div v-for="f in sec.films" :key="f.id" class="flex items-center gap-3 border-b border-line py-2.5">
          <NuxtLink :to="`/film/${f.id}`" class="flex min-w-0 flex-1 items-center gap-3">
            <FilmPoster :film="f" class="aspect-[2/3] w-10 rounded-thumb" />
            <span class="flex min-w-0 flex-col">
              <span class="truncate text-body font-semibold">{{ f.title }}</span>
              <span class="truncate text-meta text-muted">{{ f.director }} · {{ f.country }}</span>
            </span>
          </NuxtLink>
          <span class="flex shrink-0 gap-1" aria-label="Venues"><VenueDot v-for="v in venuesOf(f.id)" :key="v" :venue-id="v" /></span>
          <button
            type="button"
            class="pressable grid size-9 shrink-0 place-items-center rounded-full border"
            :class="isWatched(f.id) ? 'border-accent bg-accent text-on-accent' : 'border-line bg-raised text-muted'"
            :aria-pressed="isWatched(f.id)"
            :aria-label="isWatched(f.id) ? `Unmark ${f.title} as seen` : `Mark ${f.title} as seen`"
            @click="toggleWatched(f.id)"
          >
            <CheckIcon v-if="isWatched(f.id)" class="size-[1.125rem]" :stroke-width="2.5" />
            <EyeIcon v-else class="size-[1.125rem]" />
          </button>
        </div>
      </section>
    </template>

    <!-- ===== Events ===== -->
    <template v-else>
      <p class="text-meta text-muted">Masterclasses, workshops, the AFCM market, galas and parties. Masterclasses are free; register on afriff.com.</p>
      <div role="group" aria-label="Event type" class="scroll-row mt-3 gap-1.5">
        <UiChip v-for="f in EVENT_FILTERS" :key="f.id" :on="memory.eventFilter === f.id" @click="memory.eventFilter = f.id">{{ f.label }}</UiChip>
      </div>
      <section v-if="allWeek.length" class="mt-6">
        <h2 class="font-display text-h2 font-semibold">All week</h2>
        <EventRow v-for="e in allWeek" :key="e.id" :event="e" />
      </section>
      <section v-for="x in eventDays" :key="x.d" class="mt-6">
        <h2 class="font-display text-h2 font-semibold">{{ x.p.day }} {{ x.p.date }} {{ x.p.month }}</h2>
        <EventRow v-for="e in x.list" :key="e.id" :event="e" />
      </section>
      <p class="mt-5 mb-6 text-center text-label text-subtle">Times and rooms are samples until AFRIFF publishes the schedule.</p>
    </template>

    <ProgrammeSearch v-model:open="searching" />
  </div>
</template>
