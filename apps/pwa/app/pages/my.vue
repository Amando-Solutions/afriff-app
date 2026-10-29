<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { ArrowUpRightIcon, CheckIcon, DownloadIcon, ListChecksIcon, Share2Icon } from 'lucide-vue-next'
import { FILMS } from '@afriff/core/data/programme'
import { dateParts, timeLabel } from '@afriff/core/utils/format'
import { statusTag } from '~/lib/alerts'
import { planItems, planStart, planWhere, useStartingSoon, type PlanItem } from '~/lib/plan'
import { venueShort } from '~/lib/today'
import { useLiveClock } from '~/lib/queues'
import { useFestival } from '~/lib/store'
import { account } from '~/lib/account'

// MY FESTIVAL ("My Schedule"): two tabs, "Upcoming" (opens first every
// time: your saved screenings and events starting within the hour, each
// counting down) and "Scheduled" (your plan by day, Share my day); below both,
// your watched list with stars and the Letterboxd export. ?tab=scheduled opens
// the second tab (the My plan sheet's link). Kept on this phone, and in the
// person's account when they're signed in (lib/planSync.ts). Not signed in:
// a "Keep your plan on any phone · Sign up" card at the bottom. The account
// itself (emails switch, log out, delete) and the alerts / anonymous counts
// switches are on Profile (pages/profile.vue, the avatar in the header).
useHead({ title: 'My Festival' })
const { state, toggleScheduled } = useFestival()
const diary = useTemplateRef<HTMLElement>('diary')
const LETTERBOXD_IMPORT = 'https://letterboxd.com/import/'

const mine = computed(() => planItems(state.scheduled))
const nFilms = computed(() => mine.value.filter((i) => i.kind === 'screening').length)
const nEvents = computed(() => mine.value.length - nFilms.value)
const changed = computed(() => mine.value.filter((i) => statusTag(i.status)))
const upcoming = useStartingSoon(() => mine.value)

// ---------- Tabs ----------
const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'scheduled', label: 'Scheduled' },
] as const
type Tab = (typeof TABS)[number]['id']
const route = useRoute()
const router = useRouter()
const tab = computed<Tab>(() => (route.query.tab === 'scheduled' ? 'scheduled' : 'upcoming'))
const pickTab = (id: Tab) => router.replace({ query: { ...route.query, tab: id === 'upcoming' ? undefined : id } })

// Nothing within the hour: say what's next in the plan
const t = useLiveClock(60000)
const nextLater = computed(() => mine.value.find((i) => i.status !== 'cancelled' && planStart(i) > t.value) ?? null)
/** "Landmark · Screen 1", or the place for events away from the cinemas */
const shortWhere = (i: PlanItem) => (i.venue ? [venueShort(i.venue), i.room].filter(Boolean).join(' · ') : i.venueName)
const byDay = computed(() => mine.value.reduce<Record<string, PlanItem[]>>((acc, s) => {
  (acc[s.date] ||= []).push(s)
  return acc
}, {}))
const days = computed(() => Object.keys(byDay.value))
const summary = computed(() => {
  const s = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`
  return `${s(nFilms.value, 'screening')}${nEvents.value > 0 ? ` and ${s(nEvents.value, 'event')}` : ''} over ${s(days.value.length, 'day')}`
})

function shareDay(date: string) {
  const p = dateParts(date)
  const lines = (byDay.value[date] || []).map((item) => `• ${timeLabel(item.time)}: ${item.title} (${planWhere(item)})`)
  // link back to the app, open on that day's schedule
  const link = `${window.location.origin}/programme?day=${date}`
  const text = `My AFRIFF day, ${p.day} ${p.date} ${p.month}:\n${lines.join('\n')}\n\nFull programme: ${link}`
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}

// ---------- Watched ----------
const entries = computed(() => FILMS.flatMap((film) => {
  const w = state.watched.get(film.id)
  return w ? [{ film, date: w.date, rating: w.rating }] : []
}))

// CSV in Letterboxd's import format: https://letterboxd.com/about/importing-data/
function exportLetterboxd() {
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = [
    ['Title', 'Year', 'Directors', 'WatchedDate', 'Rating', 'Tags'],
    ...entries.value.map(({ film, date, rating }) => [film.title, film.year || '', film.director.replace(/ & /g, ', '), date, rating || '', 'afriff2026']),
  ]
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'afriff-2026-letterboxd.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<template>
  <div class="page">
    <PageTitle title="My Schedule" :icon="ListChecksIcon" />
    <p class="muted">{{ summary }}</p>

    <!-- a change to something in the plan shows on both tabs -->
    <div v-if="changed.length" class="plan-changed" role="status">
      <strong>{{ changed.length }} of your plans changed</strong>
      <NuxtLink v-for="i in changed" :key="i.id" :to="i.href" class="plan-changed-row">
        <StatusTag :status="i.status" /> {{ i.title }}
      </NuxtLink>
    </div>

    <div role="tablist" aria-label="Your festival" class="q-tabs">
      <button
        v-for="x in TABS"
        :key="x.id"
        type="button"
        role="tab"
        class="q-tab"
        :class="{ on: tab === x.id }"
        :aria-selected="tab === x.id"
        @click="pickTab(x.id)"
      >
        {{ x.label }}
      </button>
    </div>

    <!-- Upcoming: saved screenings / events starting within the hour, each counting down -->
    <section v-if="tab === 'upcoming'" class="upcoming">
      <NuxtLink v-for="item in upcoming" :key="item.id" :to="item.href" class="upcoming-card">
        <span class="upcoming-text">
          <span class="hero-eyebrow">Starts at {{ timeLabel(item.time) }}</span>
          <span class="upcoming-title">{{ item.title }}</span>
          <span class="upcoming-where">{{ shortWhere(item) }}</span>
        </span>
        <Countdown :to="planStart(item)" small :label="`${item.title} starts in`" />
      </NuxtLink>
      <div v-if="upcoming.length === 0" class="empty-block">
        <template v-if="mine.length === 0">
          <p class="muted">Nothing here yet. Tap + on any screening to add it.</p>
          <NuxtLink class="underline-link" to="/programme">Browse the schedule</NuxtLink>
        </template>
        <template v-else>
          <p class="muted">Nothing in your plan starts in the next hour. Each one shows here an hour before it starts, with a countdown.</p>
          <NuxtLink v-if="nextLater" :to="nextLater.href" class="underline-link">
            Next: {{ nextLater.title }}, {{ dateParts(nextLater.date).day }} {{ dateParts(nextLater.date).date }} {{ dateParts(nextLater.date).month }} · {{ timeLabel(nextLater.time) }}
          </NuxtLink>
          <button type="button" class="underline-link" @click="pickTab('scheduled')">See everything you've scheduled</button>
        </template>
      </div>
    </section>

    <!-- Scheduled: the plan by day -->
    <template v-else>
      <div class="stat-tiles">
        <button type="button" class="stat-tile" @click="diary?.scrollIntoView({ behavior: 'smooth', block: 'start' })">
          <span class="stat-n">{{ state.watched.size }}</span>
          <span class="stat-l">{{ state.watched.size === 1 ? 'film' : 'films' }} seen</span>
        </button>
        <div class="stat-tile">
          <span class="stat-n">{{ mine.length }}</span>
          <span class="stat-l">in your plan</span>
        </div>
        <NuxtLink to="/queues" class="stat-tile">
          <span class="stat-n">{{ state.queuesChecked.size }}</span>
          <span class="stat-l">queues checked</span>
        </NuxtLink>
      </div>

      <div v-if="mine.length === 0" class="empty-block">
        <p class="muted">Nothing here yet. Tap + on any screening to add it.</p>
        <NuxtLink class="underline-link" to="/programme">Browse the schedule</NuxtLink>
      </div>

      <section v-for="date in days" :key="date" class="my-day">
        <div class="my-day-head">
          <h2 class="my-day-title">{{ dateParts(date).day }} {{ dateParts(date).month }} {{ dateParts(date).date }}</h2>
          <button type="button" class="btn-pill" @click="shareDay(date)">
            <Share2Icon :size="18" /> Share my day
          </button>
        </div>
        <div v-for="item in byDay[date]" :key="item.id" class="my-row">
          <NuxtLink :to="item.href" class="my-row-link">
            <FilmPoster v-if="item.kind === 'screening'" :film="item.film" class="poster-thumb" />
            <EventThumb v-else :event="item.event" class="poster-thumb" />
            <span class="my-row-body">
              <span class="muted small">{{ timeLabel(item.time) }} – {{ timeLabel(item.end) }}{{ item.kind === 'event' ? ` · ${item.typeLabel}` : '' }}</span>
              <span class="my-row-title" :class="{ struck: item.status === 'cancelled' }">{{ item.title }}</span>
              <StatusTag :status="item.status" />
              <span class="venue-line"><VenueDot v-if="item.venue" :venue-id="item.venue" /> {{ planWhere(item) }}</span>
            </span>
          </NuxtLink>
          <button type="button" class="round-btn added big" :aria-label="`Remove ${item.title} from My Festival`" @click="toggleScheduled(item.id)">
            <CheckIcon :size="22" :stroke-width="2.4" />
          </button>
        </div>
      </section>

    </template>

    <!-- Watched -->
    <section ref="diary" class="section">
      <h2 class="section-title">Watched</h2>
      <p class="muted"><strong class="diary-count">{{ entries.length }}</strong> film{{ entries.length === 1 ? '' : 's' }} logged</p>

      <div class="diary-actions">
        <button type="button" class="btn btn-gold btn-small" :disabled="entries.length === 0" @click="exportLetterboxd">
          <DownloadIcon :size="16" /> Export to Letterboxd
        </button>
        <a class="btn btn-outline btn-small" :href="LETTERBOXD_IMPORT" target="_blank" rel="noopener noreferrer">
          <ArrowUpRightIcon :size="16" /> Letterboxd import
        </a>
      </div>

      <ol class="steps">
        <li><span>Tap <strong>Seen it</strong> on any film page, or the eye on the All films list.</span></li>
        <li><span>Give it a star rating if you like.</span></li>
        <li><span>Tap <strong>Export</strong>, then upload the file at letterboxd.com/import. Each film becomes a diary entry tagged afriff2026, and you can check the matches before anything is saved.</span></li>
      </ol>

      <p v-if="entries.length === 0" class="muted">Nothing logged yet. Tap Seen it on a film after the screening.</p>
      <div v-for="{ film } in entries" :key="film.id" class="diary-row">
        <NuxtLink :to="`/film/${film.id}`" class="my-row-link">
          <FilmPoster :film="film" class="poster-thumb" />
          <span class="my-row-body">
            <span class="my-row-title">{{ film.title }}</span>
            <span class="muted small">{{ film.director }} · {{ film.country || film.section }}</span>
          </span>
        </NuxtLink>
        <StarRating :film-id="film.id" :title="film.title" />
      </div>
    </section>

    <p class="footnote">{{ account.profile ? 'Kept on this phone and in your account.' : 'Kept on this phone. No account needed.' }}</p>
    <AccountCard v-if="!account.profile" back="/my" />
  </div>
</template>
