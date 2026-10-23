<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ArrowUpRightIcon, AwardIcon, CheckIcon, ChevronLeftIcon, EyeIcon, MessageCircleIcon, PlayIcon, PlusIcon, Share2Icon,
} from 'lucide-vue-next'
import { FESTIVAL, FILMS, SCREENINGS, filmById, venueById } from '~/data/programme'
import { dateParts, fromMinutes, initials, queueLabel, runtimeLabel, screeningStart, timeLabel, toMinutes } from '~/lib/format'
import { queueAt, useLiveClock } from '~/lib/queues'
import { useFestival } from '~/lib/store'

// FILM PAGE: poster, title, Seen it, synopsis, showtimes, live queue, credits, more from the section.
const route = useRoute()
const router = useRouter()
const film = computed(() => filmById(String(route.params.id)))
useHead({ title: () => film.value?.title || 'Film' })

const { isScheduled, toggleScheduled, isWatched, toggleWatched, markQueuesChecked } = useFestival()
const expanded = ref(false)

const showings = computed(() => {
  const id = film.value?.id
  return id ? SCREENINGS.filter((s) => s.film === id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)) : []
})
const directors = computed(() => (film.value?.director || '').split(' & ').filter(Boolean))
const facts = computed(() => [film.value?.year, film.value?.runtime ? runtimeLabel(film.value.runtime) : '', film.value?.country].filter(Boolean).join(' · '))

function back() {
  if (window.history.state?.back) router.back()
  else router.push('/programme')
}

// ---------- Poster: shown whole, never cropped ----------
// Tall posters sit centred, wide ones use the full width. No poster (or it fails) → colour card with title.
const shape = ref<'none' | 'loading' | 'wide' | 'tall'>('none')
watch(film, (f) => { shape.value = f?.image ? 'loading' : 'none' }, { immediate: true })
function onPosterLoad(e: Event) {
  const img = e.currentTarget as HTMLImageElement
  shape.value = img.naturalWidth > img.naturalHeight ? 'wide' : 'tall'
}

// ---------- Queue ----------
const t = useLiveClock()
// a showing's queue is over once the film has started
const allDone = computed(() => showings.value.length > 0 && showings.value.every((s) => screeningStart(s).getTime() < t.value))
const openQueuesHere = computed(() => showings.value.flatMap((s) => {
  const queue = queueAt(s, t.value)
  const label = queueLabel(queue)
  return queue && label ? [{ ...s, queue, label }] : []
}))
watch(() => openQueuesHere.value.map((s) => s.id).join(','), (ids) => { if (ids) markQueuesChecked(ids.split(',')) }, { immediate: true })

// ---------- Share: phone's share sheet (WhatsApp, SMS…), otherwise WhatsApp ----------
function share() {
  const f = film.value
  if (!f) return
  const url = `${window.location.origin}/film/${f.id}`
  const when = showings.value.filter((s) => s.status !== 'cancelled')
    .map((s) => { const p = dateParts(s.date); return `• ${p.day} ${p.date} ${p.month}, ${timeLabel(s.time)} at ${venueById(s.venue)?.name ?? ''}` })
  const text = [
    `${f.title}${f.year ? ` (${f.year})` : ''}, directed by ${f.director}. Showing at AFRIFF 2026:`,
    ...(when.length ? when : ['Showtimes coming soon']),
  ].join('\n')
  if (navigator.share) navigator.share({ title: f.title, text, url }).catch(() => {})
  else window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener')
}
const scrollToShowtimes = () => document.getElementById('showtimes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

const more = computed(() => {
  const current = film.value
  return current ? FILMS.filter((f) => f.section === current.section && f.id !== current.id).slice(0, 12) : []
})
</script>

<template>
  <div v-if="!film">
    <UiEmptyState title="We couldn't find that film" description="It may have been removed from the programme.">
      <UiButton to="/programme" variant="secondary">Back to the programme</UiButton>
    </UiEmptyState>
  </div>

  <article v-else :key="film.id">
    <!-- Top bar: Back + genre -->
    <div class="mb-4 flex items-center justify-between gap-2">
      <button type="button" class="pressable -ml-2 inline-flex h-9 items-center gap-1 rounded-full pr-3 pl-1.5 text-meta font-medium text-muted hover:bg-hover hover:text-ink" @click="back">
        <ChevronLeftIcon class="size-5" /> Back
      </button>
      <UiBadge v-if="film.genre">{{ film.genre }}</UiBadge>
    </div>

    <!-- Poster (whole) with the trailer button on it -->
    <div
      v-if="shape !== 'none'"
      class="relative mx-auto overflow-hidden rounded-card bg-raised shadow-card outline -outline-offset-1 outline-white/10"
      :class="shape === 'wide' ? 'w-full' : 'w-[min(64%,17rem)]'"
    >
      <img :src="film.image" :alt="`${film.title} poster`" decoding="async" class="block h-auto min-h-30 w-full" @load="onPosterLoad" @error="shape = 'none'" />
      <a v-if="film.trailer" :href="film.trailer" target="_blank" rel="noopener noreferrer" class="absolute bottom-3 left-1/2 z-3 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-navy-950/80 py-1.5 pr-3.5 pl-1.5 text-meta font-semibold whitespace-nowrap text-white backdrop-blur">
        <span class="grid size-6 place-items-center rounded-full bg-accent text-on-accent"><PlayIcon class="size-3" fill="currentColor" /></span> Watch trailer
      </a>
    </div>
    <FilmPoster v-else :film="{ ...film, image: '' }" class="mx-auto flex aspect-[2/3] w-[min(64%,17rem)] items-end rounded-card shadow-card">
      <span class="relative z-2 flex w-full flex-col gap-1.5 px-4 pt-4 text-white" :class="film.trailer ? 'pb-16' : 'pb-4'">
        <span class="font-display text-[1.75rem] leading-[1.05] font-semibold tracking-[-0.025em] [text-shadow:0_2px_14px_rgb(0_0_0/0.45)]">{{ film.title }}</span>
        <span class="eyebrow text-white/75">{{ film.director }}</span>
      </span>
      <a v-if="film.trailer" :href="film.trailer" target="_blank" rel="noopener noreferrer" class="absolute bottom-3 left-1/2 z-3 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-navy-950/80 py-1.5 pr-3.5 pl-1.5 text-meta font-semibold whitespace-nowrap text-white backdrop-blur">
        <span class="grid size-6 place-items-center rounded-full bg-accent text-on-accent"><PlayIcon class="size-3" fill="currentColor" /></span> Watch trailer
      </a>
    </FilmPoster>

    <!-- Badges, title, facts -->
    <div class="mt-5 flex flex-wrap items-center gap-1.5">
      <span v-if="film.section" class="inline-flex items-center gap-1.5 eyebrow text-accent-ink">
        <span class="size-1.5 rounded-full bg-accent" aria-hidden="true" />{{ film.section }}
      </span>
      <UiBadge v-if="film.premiere" tone="accent">{{ film.premiere }}</UiBadge>
      <NuxtLink v-if="film.competition" to="/jury"><UiBadge><AwardIcon /> In competition</UiBadge></NuxtLink>
    </div>
    <h1 class="mt-2 font-display text-display font-semibold">{{ film.title }}</h1>
    <p v-if="facts" class="mt-1 text-meta text-muted tabular-nums">{{ facts }}</p>

    <!-- Actions -->
    <div class="mt-4 flex items-center gap-2">
      <UiButton v-if="showings.length" @click="scrollToShowtimes">{{ showings.length }} screening{{ showings.length === 1 ? '' : 's' }}</UiButton>
      <!-- one gold action per screen: "Seen it" stays secondary, tinted when it's on -->
      <UiButton variant="secondary" :class="isWatched(film.id) && 'border-accent/60! bg-accent-soft! text-accent-ink!'" :aria-pressed="isWatched(film.id)" @click="toggleWatched(film.id)">
        <CheckIcon v-if="isWatched(film.id)" /><EyeIcon v-else /> Seen it
      </UiButton>
      <button type="button" class="pressable ml-auto grid size-10 place-items-center rounded-full border border-line bg-surface text-ink shadow-card" aria-label="Share this film" @click="share">
        <Share2Icon class="size-[1.125rem]" />
      </button>
    </div>

    <!-- Synopsis, 3 lines until Read more -->
    <p class="mt-5 text-prose text-ink/90" :class="!expanded && 'clamp-3'">{{ film.synopsis }}</p>
    <button type="button" class="mt-1 text-meta font-medium text-accent-ink" @click="expanded = !expanded">{{ expanded ? 'Show less' : 'Read more' }}</button>

    <!-- Showtimes -->
    <section id="showtimes" class="mt-8 scroll-mt-20">
      <div class="mb-3 flex items-baseline justify-between gap-4">
        <h2 class="font-display text-h2 font-semibold">Showtimes</h2>
        <a :href="FESTIVAL.filmUrl(film.id)" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-0.5 text-label font-medium text-muted hover:text-ink">
          On afriff.com <ArrowUpRightIcon class="size-4" />
        </a>
      </div>
      <p v-if="showings.length === 0" class="text-muted">Showtimes will appear here once the schedule is published.</p>
      <div v-else class="scroll-row gap-3 pb-1">
        <div v-for="s in showings" :key="s.id" class="flex w-44 shrink-0 snap-start flex-col gap-2">
          <div class="card flex flex-1 flex-col gap-1 p-3.5">
            <div class="flex items-baseline gap-2">
              <span class="font-display text-h1 leading-none font-semibold tabular-nums">{{ String(dateParts(s.date).date).padStart(2, '0') }}</span>
              <span class="eyebrow text-muted">{{ dateParts(s.date).month }} {{ dateParts(s.date).day }}</span>
            </div>
            <span class="mt-1 text-body font-semibold tabular-nums" :class="s.status === 'cancelled' && 'text-muted line-through'">{{ timeLabel(s.time) }}</span>
            <span v-if="film.runtime > 0" class="text-label text-muted">ends {{ timeLabel(fromMinutes(toMinutes(s.time) + film.runtime)) }}</span>
            <StatusTag :status="s.status" />
            <VenueLine :venue-id="s.venue" class="mt-1" />
            <span class="text-label text-muted">{{ s.screen }}</span>
            <span class="mt-1 flex flex-wrap gap-1">
              <UiBadge :tone="s.tag === 'Industry' ? 'info' : 'neutral'">{{ s.tag }}</UiBadge>
              <UiBadge v-if="s.qa" tone="accent"><MessageCircleIcon /> Q&amp;A</UiBadge>
            </span>
          </div>
          <UiButton :variant="isScheduled(s.id) ? 'primary' : 'secondary'" size="sm" :aria-pressed="isScheduled(s.id)" @click="toggleScheduled(s.id)">
            <template v-if="isScheduled(s.id)"><CheckIcon /> Scheduled</template>
            <template v-else><PlusIcon /> Schedule</template>
          </UiButton>
        </div>
      </div>
    </section>

    <!-- Queue -->
    <section class="mt-8">
      <h2 class="mb-3 font-display text-h2 font-semibold">Queue</h2>
      <p v-if="allDone" class="text-muted">Every showing has screened. No queues left for this film.</p>
      <p v-else-if="openQueuesHere.length === 0" class="text-muted">Queues open 2 hours before each showing. Check back then for a live count.</p>
      <div v-else class="flex flex-col gap-2.5">
        <div v-for="s in openQueuesHere" :key="s.id" class="card flex items-center justify-between gap-3 p-3.5">
          <div>
            <span class="font-display text-h1 font-semibold tabular-nums">{{ s.queue.inLine }}</span>
            <span class="text-meta text-muted"> in line · {{ s.queue.seatsLeft }} seats left</span>
            <div class="text-meta text-muted">{{ dateParts(s.date).day }} {{ timeLabel(s.time) }} · {{ venueById(s.venue)?.name }}</div>
          </div>
          <span class="text-meta font-semibold" :class="`tone-${s.label.tone}`">{{ s.label.text }}</span>
        </div>
      </div>
    </section>

    <!-- Credits -->
    <section class="mt-8">
      <h2 class="mb-3 font-display text-h2 font-semibold">Directed by</h2>
      <div class="flex flex-wrap gap-4">
        <div v-for="d in directors" :key="d" class="flex items-center gap-3">
          <div class="grid size-12 place-items-center rounded-tile border border-line bg-raised font-display text-h3 font-semibold text-muted">{{ initials(d) }}</div>
          <span class="text-body font-semibold">{{ d }}</span>
        </div>
      </div>
      <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-meta">
        <template v-if="film.cast"><dt class="text-muted">Cast</dt><dd>{{ film.cast }}</dd></template>
        <template v-if="film.country"><dt class="text-muted">Country</dt><dd>{{ film.country }}</dd></template>
        <template v-if="film.language"><dt class="text-muted">Language</dt><dd>{{ film.language }}</dd></template>
        <dt class="text-muted">Programme</dt><dd>{{ film.section }}</dd>
      </dl>
    </section>

    <!-- More from this section -->
    <section v-if="more.length" class="mt-8">
      <UiSectionHeader :title="`More from ${film.section}`" to="/programme/films" />
      <div class="scroll-row gap-3 pb-1">
        <NuxtLink v-for="f in more" :key="f.id" :to="`/film/${f.id}`" class="flex w-28 shrink-0 snap-start flex-col gap-1">
          <FilmPoster :film="f" class="aspect-[2/3] w-full rounded-tile shadow-card">
            <span v-if="!f.image" class="absolute inset-x-2 bottom-2 z-2 line-clamp-3 text-meta leading-tight font-semibold text-white">{{ f.title }}</span>
          </FilmPoster>
          <span class="mt-1 truncate text-meta font-semibold">{{ f.title }}</span>
          <span class="text-label text-muted">{{ runtimeLabel(f.runtime) }}</span>
        </NuxtLink>
      </div>
    </section>
  </article>
</template>
