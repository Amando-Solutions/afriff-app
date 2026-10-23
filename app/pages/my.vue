<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { ArrowUpRightIcon, CheckIcon, DownloadIcon, ListChecksIcon, Share2Icon, StarIcon } from 'lucide-vue-next'
import { FILMS } from '~/data/programme'
import { dateParts, timeLabel } from '~/lib/format'
import { statusTag } from '~/lib/alerts'
import { planItems, planWhere, type PlanItem } from '~/lib/plan'
import { useFestival } from '~/lib/store'

// MY FESTIVAL ("My Schedule"): your plan by day, Share my day, your watched
// list with stars and the Letterboxd export. Kept on this phone.
useHead({ title: 'My Festival' })
const { state, toggleScheduled, rateWatched, setSharing } = useFestival()
const diary = useTemplateRef<HTMLElement>('diary')
const LETTERBOXD_IMPORT = 'https://letterboxd.com/import/'

const mine = computed(() => planItems(state.scheduled))
const nFilms = computed(() => mine.value.filter((i) => i.kind === 'screening').length)
const nEvents = computed(() => mine.value.length - nFilms.value)
const changed = computed(() => mine.value.filter((i) => statusTag(i.status)))
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
  const text = `My AFRIFF day, ${p.day} ${p.date} ${p.month}:\n${lines.join('\n')}`
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
// tapping your current rating again clears it
const rate = (filmId: string, current: number, n: number) => rateWatched(filmId, current === n ? 0 : n)
</script>

<template>
  <div>
    <PageTitle title="My Schedule" :icon="ListChecksIcon" :description="summary" />

    <div v-if="changed.length" role="status" class="mt-4 flex flex-col gap-1.5 rounded-tile border border-danger/35 bg-danger-soft p-3">
      <strong class="text-meta font-semibold text-danger">{{ changed.length }} of your plans changed</strong>
      <NuxtLink v-for="i in changed" :key="i.id" :to="i.href" class="flex items-center gap-2 text-meta">
        <StatusTag :status="i.status" /> {{ i.title }}
      </NuxtLink>
    </div>

    <!-- Three numbers: one quiet panel, so the plan below stays the focus -->
    <div class="card mt-4 grid grid-cols-3 divide-x divide-line overflow-hidden">
      <button type="button" class="row-interactive flex flex-col items-start px-3.5 py-3 text-left" @click="diary?.scrollIntoView({ behavior: 'smooth', block: 'start' })">
        <span class="font-display text-h2 font-semibold tabular-nums">{{ state.watched.size }}</span>
        <span class="text-label text-muted">{{ state.watched.size === 1 ? 'film' : 'films' }} seen</span>
      </button>
      <div class="flex flex-col px-3.5 py-3">
        <span class="font-display text-h2 font-semibold tabular-nums">{{ mine.length }}</span>
        <span class="text-label text-muted">in your plan</span>
      </div>
      <NuxtLink to="/queues" class="row-interactive flex flex-col px-3.5 py-3">
        <span class="font-display text-h2 font-semibold tabular-nums">{{ state.queuesChecked.size }}</span>
        <span class="text-label text-muted">queues checked</span>
      </NuxtLink>
    </div>

    <UiEmptyState v-if="mine.length === 0" :icon="ListChecksIcon" title="Nothing here yet" description="Tap + on any screening to add it.">
      <UiButton to="/programme" variant="secondary">Browse the schedule</UiButton>
    </UiEmptyState>

    <!-- Plan, by day -->
    <section v-for="date in days" :key="date" class="mt-7">
      <div class="mb-1 flex items-center justify-between gap-3">
        <h2 class="font-display text-h2 font-semibold">{{ dateParts(date).day }} {{ dateParts(date).date }} {{ dateParts(date).month }}</h2>
        <UiButton size="sm" variant="secondary" @click="shareDay(date)"><Share2Icon /> Share my day</UiButton>
      </div>
      <div v-for="item in byDay[date]" :key="item.id" class="flex items-center gap-3 border-b border-line py-3">
        <NuxtLink :to="item.href" class="flex min-w-0 flex-1 items-center gap-3">
          <FilmPoster v-if="item.kind === 'screening'" :film="item.film" class="aspect-[2/3] w-12 rounded-thumb" />
          <EventThumb v-else :event="item.event" class="aspect-[2/3] w-12 rounded-thumb" />
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="text-meta font-medium text-ink/80 tabular-nums">{{ timeLabel(item.time) }} – {{ timeLabel(item.end) }}<span v-if="item.kind === 'event'" class="text-muted"> · {{ item.typeLabel }}</span></span>
            <span class="line-clamp-2 text-body font-semibold" :class="item.status === 'cancelled' && 'text-muted line-through'">{{ item.title }}</span>
            <StatusTag :status="item.status" />
            <VenueLine :venue-id="item.venue" :place="item.venueName" :screen="item.room" />
          </span>
        </NuxtLink>
        <AddButton added :title="item.title" @toggle="toggleScheduled(item.id)" />
      </div>
    </section>

    <!-- Watched -->
    <section ref="diary" class="mt-9 scroll-mt-20">
      <h2 class="font-display text-h2 font-semibold">Watched</h2>
      <p class="mt-0.5 text-muted"><strong class="font-semibold text-ink tabular-nums">{{ entries.length }}</strong> film{{ entries.length === 1 ? '' : 's' }} logged</p>

      <div class="mt-3 flex flex-wrap gap-2">
        <UiButton size="sm" :disabled="entries.length === 0" @click="exportLetterboxd"><DownloadIcon /> Export to Letterboxd</UiButton>
        <UiButton size="sm" variant="secondary" :href="LETTERBOXD_IMPORT"><ArrowUpRightIcon /> Letterboxd import</UiButton>
      </div>

      <ol class="mt-4 flex flex-col gap-2.5">
        <li v-for="(step, n) in [
          ['Tap ', 'Seen it', ' on any film page, or the eye on the All films list.'],
          ['Give it a star rating if you like.', '', ''],
          ['Tap ', 'Export', ', then upload the file at letterboxd.com/import. Each film becomes a diary entry tagged afriff2026, and you can check the matches before anything is saved.'],
        ]" :key="n" class="flex items-start gap-3 text-meta text-muted">
          <span class="grid size-6 shrink-0 place-items-center rounded-full bg-raised text-label font-semibold text-accent-ink">{{ n + 1 }}</span>
          <span class="pt-0.5">{{ step[0] }}<strong v-if="step[1]" class="font-semibold text-ink">{{ step[1] }}</strong>{{ step[2] }}</span>
        </li>
      </ol>

      <p v-if="entries.length === 0" class="mt-4 text-muted">Nothing logged yet. Tap Seen it on a film after the screening.</p>
      <div v-for="{ film, rating } in entries" :key="film.id" class="border-b border-line py-3">
        <NuxtLink :to="`/film/${film.id}`" class="flex min-w-0 items-center gap-3">
          <FilmPoster :film="film" class="aspect-[2/3] w-12 rounded-thumb" />
          <span class="flex min-w-0 flex-col">
            <span class="truncate text-body font-semibold">{{ film.title }}</span>
            <span class="truncate text-meta text-muted">{{ film.director }} · {{ film.country || film.section }}</span>
          </span>
        </NuxtLink>
        <div class="mt-1 ml-[3.75rem] flex gap-0.5" role="radiogroup" :aria-label="`Your rating for ${film.title}`">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            role="radio"
            :aria-checked="rating === n"
            :aria-label="`${n} star${n > 1 ? 's' : ''}`"
            class="pressable grid size-9 place-items-center"
            :class="n <= rating ? 'text-accent-ink' : 'text-subtle'"
            @click="rate(film.id, rating, n)"
          >
            <StarIcon class="size-5" :fill="n <= rating ? 'currentColor' : 'none'" :stroke-width="1.75" />
          </button>
        </div>
      </div>
    </section>

    <p class="mt-6 text-center text-label text-subtle">Kept on this phone. No account needed.</p>
    <label class="card mt-4 flex cursor-pointer items-center gap-4 p-4">
      <span class="flex flex-1 flex-col gap-1">
        <span class="text-body font-semibold">Share anonymous counts with AFRIFF</span>
        <span class="text-meta text-muted">No names or contact details: just which screenings are planned and how films are rated, to help plan the festival.</span>
      </span>
      <input type="checkbox" role="switch" class="peer sr-only" :checked="state.sharing" @change="setSharing(($event.target as HTMLInputElement).checked)" />
      <span
        class="relative h-7 w-12 shrink-0 rounded-full bg-raised transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-ink after:shadow after:transition-transform after:content-[''] peer-checked:after:translate-x-5 peer-checked:after:bg-on-accent"
        aria-hidden="true"
      />
    </label>
  </div>
</template>
