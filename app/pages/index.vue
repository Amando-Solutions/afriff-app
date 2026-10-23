<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { AwardIcon, GraduationCapIcon, MapPinIcon, TicketIcon, TriangleAlertIcon, XIcon } from 'lucide-vue-next'
import { activeBanner, newsLink } from '~/lib/alerts.js'
import { FESTIVAL, SCREENINGS, filmById } from '~/data/programme.js'
import { EVENTS, EVENT_TYPES, isMultiDay } from '~/data/events.js'
import { dateParts, queueLabel, timeLabel } from '~/lib/format.js'
import { queueAt, useLiveClock } from '~/lib/queues.js'
import { lagosDate, now as clockNow } from '~/lib/now.js'
import { dayInfo, festivalPhase, venueShort } from '~/lib/today.js'
import { openProgrammeDay } from '~/lib/programmeMemory.js'
import { useFestival } from '~/lib/store.js'

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
const pad = (n) => String(n).padStart(2, '0')

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
const openingDay = FESTIVAL.days[0]
const openingList = computed(() => {
  // the opening film always makes the cut, then the rest of the day; shown in time order
  const opening = (s) => (filmById(s.film)?.section === 'Opening Movie' ? 0 : 1)
  return SCREENINGS.filter((s) => s.date === openingDay)
    .sort((a, b) => opening(a) - opening(b) || a.time.localeCompare(b.time))
    .slice(0, 4)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((s) => ({ kind: 'screening', item: s }))
})
const todayInfo = computed(() => (phase.value === 'during' ? dayInfo(today.value, t.value) : null))
const dayRows = computed(() => (phase.value === 'during' ? todayInfo.value.upcoming.slice(0, 4) : openingList.value))
const dayHeading = computed(() => {
  const p = dateParts(phase.value === 'during' ? today.value : openingDay)
  return { title: phase.value === 'during' ? 'Today' : 'Opening day', meta: `${p.day} ${p.date} ${p.month}` }
})

function rowInfo(x) {
  if (x.kind === 'screening') {
    const s = x.item
    const film = filmById(s.film)
    return {
      id: s.id, to: `/film/${film.id}`, title: film.title, film, status: s.status,
      meta: `${timeLabel(s.time)} · ${venueShort(s.venue)}`,
      full: queueLabel(queueAt(s))?.text === 'Full',
    }
  }
  const e = x.item
  return {
    id: e.id, to: `/event/${e.id}`, title: e.title.split(':')[0], event: e, status: e.status,
    meta: `${timeLabel(e.time)} · ${e.venue ? venueShort(e.venue) : e.place}`, full: false,
  }
}

// ---------- Masterclasses first (free, registration needed), then the big festival moments ----------
const strip = computed(() => {
  const byTime = (a, b) => (a.date + a.time).localeCompare(b.date + b.time)
  const learn = EVENTS.filter((e) => EVENT_TYPES[e.type].group === 'learn').sort(byTime)
  const other = EVENTS.filter((e) => EVENT_TYPES[e.type].group !== 'learn' && !isMultiDay(e) && e.type !== 'market').sort(byTime)
  return [...learn, ...other]
})
</script>

<template>
  <div>
    <!-- Urgent news (newest urgent alert that hasn't passed its "show until" time) -->
    <div
      v-if="urgent && !bannerHidden"
      role="status"
      class="mb-4 flex items-start gap-2.5 rounded-tile border border-danger/35 bg-danger-soft py-2.5 pr-2 pl-3 text-meta"
    >
      <TriangleAlertIcon class="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
      <NuxtLink :to="urgentLink?.href || '/news'" class="flex-1">
        <strong class="font-semibold">{{ urgentTitle }}</strong> <span class="text-ink/85">{{ urgent.body }}</span>
        <span v-if="urgentLink" class="font-medium text-danger"> {{ urgentLink.label }} →</span>
      </NuxtLink>
      <button type="button" class="pressable -my-0.5 grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-hover" aria-label="Dismiss" @click="bannerHidden = true">
        <XIcon class="size-4" />
      </button>
    </div>

    <!-- Before the festival: countdown -->
    <HeroCard v-if="phase === 'before'">
      <p class="text-micro font-semibold tracking-[0.12em] text-gold-300 uppercase">1–7 Nov 2026 · Lagos</p>
      <h1 class="mt-1.5 max-w-[24ch] font-display text-2xl leading-7 font-semibold tracking-tight">Seven days of African stories on the big screen</h1>
      <p v-if="countdown.done" class="mt-3 text-meta text-white/70">The festival is on. Enjoy the films!</p>
      <div v-else class="mt-4 border-t border-white/10 pt-3" role="timer" :aria-label="`Opening night in ${countdown.days} days, ${countdown.hours} hours and ${countdown.mins} minutes`">
        <p class="mb-2 text-meta text-white/70">Opening night in</p>
        <ol class="grid grid-cols-3 gap-2" aria-hidden="true">
          <li v-for="u in [[countdown.days, 'Days'], [countdown.hours, 'Hours'], [countdown.mins, 'Mins']]" :key="u[1]" class="rounded-tile bg-white/5 px-1 py-1.5 text-center">
            <span class="block font-display text-2xl leading-7 font-semibold tabular-nums">{{ pad(u[0]) }}</span>
            <span class="block text-micro text-white/60">{{ u[1] }}</span>
          </li>
        </ol>
      </div>
      <UiButton to="/programme" block class="mt-4">Explore the programme</UiButton>
    </HeroCard>

    <!-- 1–7 Nov: the daily highlight -->
    <DailyHighlight v-else-if="phase === 'during'" :day="today" :t="t" />

    <!-- After 7 Nov: thank you -->
    <HeroCard v-else>
      <p class="text-micro font-semibold tracking-[0.12em] text-gold-300 uppercase">AFRIFF 2026 · That's a wrap</p>
      <h1 class="mt-1.5 max-w-[24ch] font-display text-2xl leading-7 font-semibold tracking-tight">Thank you for seven days of African stories</h1>
      <p class="mt-3 text-meta text-white/70">Rate the films you saw and export them to Letterboxd.</p>
      <UiButton to="/my" block class="mt-4">Your watched list</UiButton>
    </HeroCard>

    <!-- Shortcuts: one word each -->
    <nav aria-label="Shortcuts" class="mt-5 grid grid-cols-4 gap-2">
      <component
        :is="s.to ? NuxtLink : 'button'"
        v-for="s in shortcuts"
        :key="s.label"
        :to="s.to"
        :type="s.to ? undefined : 'button'"
        class="pressable flex min-w-0 flex-col items-center gap-2"
        @click="s.action?.()"
      >
        <span class="grid size-14 place-items-center rounded-card border border-line bg-surface text-accent-ink shadow-card">
          <component :is="s.icon" class="size-[1.375rem]" :stroke-width="1.75" />
        </span>
        <span class="text-center text-label leading-tight font-medium">{{ s.label }}</span>
      </component>
    </nav>
    <HowToAttendSheet v-model:open="howTo" />

    <!-- Opening day / Today -->
    <section v-if="phase !== 'after'" class="mt-8">
      <UiSectionHeader :title="dayHeading.title" :meta="dayHeading.meta" to="/programme" @link="phase === 'during' && openProgrammeDay(today)" />
      <p v-if="phase === 'during' && dayRows.length === 0" class="text-muted">
        Nothing else starts today.
        <NuxtLink v-if="todayInfo.tomorrow" to="/programme" class="font-medium text-accent-ink" @click="openProgrammeDay(todayInfo.tomorrow)">See tomorrow</NuxtLink>
      </p>
      <div v-else class="card divide-y divide-line overflow-hidden">
        <div v-for="x in dayRows.map(rowInfo)" :key="x.id" class="row-interactive flex items-center gap-3 px-3 py-2.5">
          <NuxtLink :to="x.to" class="flex min-w-0 flex-1 items-center gap-3">
            <FilmPoster v-if="x.film" :film="x.film" class="aspect-[2/3] w-10 rounded-thumb" />
            <EventThumb v-else :event="x.event" icon-size="size-4" class="aspect-[2/3] w-10 rounded-thumb" />
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="truncate text-body font-semibold" :class="x.status === 'cancelled' && 'text-muted line-through'">{{ x.title }}</span>
              <span class="flex flex-wrap items-center gap-x-1.5 text-meta text-muted tabular-nums">
                {{ x.meta }}<span v-if="x.full" class="font-semibold text-danger">· Full</span>
                <StatusTag :status="x.status" />
              </span>
            </span>
          </NuxtLink>
          <AddButton :added="isScheduled(x.id)" :title="x.title" @toggle="toggleScheduled(x.id)" />
        </div>
      </div>
    </section>

    <!-- Masterclasses & events -->
    <section class="mt-8">
      <UiSectionHeader title="Masterclasses & events" to="/programme/events" />
      <div class="scroll-row gap-3 pb-1">
        <EventCard v-for="e in strip" :key="e.id" :event="e" />
      </div>
    </section>

    <!-- Sponsors -->
    <section class="mt-8 border-t border-line pt-5">
      <p class="mb-2 text-micro font-semibold tracking-[0.12em] text-subtle uppercase">Supported by</p>
      <SponsorMarquee variant="strip" />
    </section>
  </div>
</template>
