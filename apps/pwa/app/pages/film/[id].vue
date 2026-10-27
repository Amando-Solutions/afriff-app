<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ArrowRightIcon, AwardIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, MessageCircleIcon, PlayIcon, PlusIcon, Share2Icon,
} from 'lucide-vue-next'
import { FESTIVAL, FILMS, SCREENINGS, filmById, venueById } from '@afriff/core/data/programme'
import { dateParts, fromMinutes, initials, queueLabel, runtimeLabel, screeningStart, timeLabel, toMinutes } from '@afriff/core/utils/format'
import { queueAt, useLiveClock } from '~/lib/queues'
import { useFestival } from '~/lib/store'

// FILM PAGE: poster, title, Seen it (+ your star rating once seen), synopsis, showtimes, live queue, credits, more from the section.
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
  <div v-if="!film" class="page">
    <p class="empty">We couldn't find that film. <NuxtLink class="link" to="/programme">Back to the programme</NuxtLink></p>
  </div>

  <div v-else :key="film.id" class="page film-page">
    <!-- Top bar: Back + genre -->
    <div class="film-topbar">
      <a href="/programme" class="pill-btn" @click.prevent="back"><ChevronLeftIcon :size="20" /> Back</a>
      <div class="film-topbar-right">
        <span v-if="film.genre" class="pill-btn static">{{ film.genre }}</span>
      </div>
    </div>

    <!-- The whole poster, never cropped: tall posters sit centred, wide ones use
         the full width. No poster (or it fails) → tall colour card with title. -->
    <div v-if="shape !== 'none'" class="hero-poster has-image" :class="{ wide: shape === 'wide' }">
      <img :src="film.image" :alt="`${film.title} poster`" decoding="async" @load="onPosterLoad" @error="shape = 'none'" />
      <a v-if="film.trailer" :href="film.trailer" target="_blank" rel="noopener noreferrer" class="trailer-btn">
        <span class="play"><PlayIcon :size="14" fill="currentColor" /></span> Watch trailer
      </a>
    </div>
    <FilmPoster v-else :film="{ ...film, image: '' }" class="hero-poster">
      <span class="hero-poster-text">
        <span class="hero-poster-title">{{ film.title }}</span>
        <span class="hero-poster-director">{{ film.director }}</span>
      </span>
      <a v-if="film.trailer" :href="film.trailer" target="_blank" rel="noopener noreferrer" class="trailer-btn">
        <span class="play"><PlayIcon :size="14" fill="currentColor" /></span> Watch trailer
      </a>
    </FilmPoster>

    <div class="film-badges">
      <span v-if="film.section" class="film-badge">{{ film.section }}</span>
      <span v-if="film.premiere" class="film-badge gold">{{ film.premiere }}</span>
      <NuxtLink v-if="film.competition" to="/jury" class="film-badge comp"><AwardIcon :size="13" /> In competition</NuxtLink>
    </div>

    <h1 class="film-title">{{ film.title }}</h1>
    <p class="film-facts">{{ facts }}</p>

    <div class="film-actions">
      <button v-if="showings.length" type="button" class="btn-jump" @click="scrollToShowtimes">
        {{ showings.length }} screening{{ showings.length === 1 ? '' : 's' }}
      </button>
      <button type="button" class="btn-seen" :class="{ on: isWatched(film.id) }" :aria-pressed="isWatched(film.id)" @click="toggleWatched(film.id)">
        <CheckIcon v-if="isWatched(film.id)" :size="20" /><EyeIcon v-else :size="20" /> Seen it
      </button>
      <button type="button" class="round-btn big" aria-label="Share this film" @click="share"><Share2Icon :size="20" /></button>
    </div>
    <div v-if="isWatched(film.id)" class="film-rating">
      <span class="film-rating-label">Your rating</span>
      <StarRating :film-id="film.id" :title="film.title" />
    </div>

    <template v-if="film.synopsis">
      <p class="synopsis" :class="{ open: expanded }">{{ film.synopsis }}</p>
      <button v-if="film.synopsis.length > 100" type="button" class="read-more" @click="expanded = !expanded">
        {{ expanded ? 'Show less' : 'Read more' }}
      </button>
    </template>

    <section id="showtimes" class="section">
      <div class="section-head">
        <h2 class="section-title">Showtimes</h2>
        <a :href="FESTIVAL.filmUrl(film.id)" target="_blank" rel="noopener noreferrer" class="underline-link">
          On afriff.com <ArrowRightIcon :size="16" />
        </a>
      </div>
      <p v-if="showings.length === 0" class="muted">Showtimes will appear here once the schedule is published.</p>
      <div v-else class="showtimes">
        <div v-for="s in showings" :key="s.id" class="showtime">
          <div class="showtime-card">
            <div class="showtime-date">
              <span class="big-num">{{ String(dateParts(s.date).date).padStart(2, '0') }}</span>
              <span class="showtime-mon">{{ dateParts(s.date).monthUpper }} {{ dateParts(s.date).day.toUpperCase() }}</span>
            </div>
            <span class="showtime-time" :class="{ struck: s.status === 'cancelled' }">{{ timeLabel(s.time) }}</span>
            <span v-if="film.runtime > 0" class="showtime-end">ends {{ timeLabel(fromMinutes(toMinutes(s.time) + film.runtime)) }}</span>
            <StatusTag :status="s.status" />
            <span class="venue-line"><VenueDot :venue-id="s.venue" /> {{ venueById(s.venue)?.name }}</span>
            <span class="muted small">{{ s.screen }}</span>
            <span class="showtime-tags">
              <span class="pill" :class="{ 'pill-alt': s.tag === 'Industry' }">{{ s.tag }}</span>
              <span v-if="s.qa" class="pill pill-qa"><MessageCircleIcon :size="12" /> Q&amp;A</span>
            </span>
          </div>
          <button type="button" class="btn-schedule" :class="{ added: isScheduled(s.id) }" :aria-pressed="isScheduled(s.id)" @click="toggleScheduled(s.id)">
            <template v-if="isScheduled(s.id)"><CheckIcon :size="18" /> Scheduled</template>
            <template v-else><PlusIcon :size="18" /> Schedule</template>
          </button>
        </div>
      </div>
      <p v-if="showings.length > 0" class="ticket-note">
        Adding to My Festival doesn't book a seat.
        <a :href="FESTIVAL.ticketsUrl" target="_blank" rel="noopener noreferrer">Get your tickets on afriff.com</a>.
      </p>
    </section>

    <section v-if="showings.length > 0" class="section">
      <h2 class="section-title">Queue</h2>
      <p v-if="allDone" class="muted">Every showing has screened. No queues left for this film.</p>
      <p v-else-if="openQueuesHere.length === 0" class="muted">Queues open 2 hours before each showing. Check back then for a live count.</p>
      <div v-else class="stack">
        <div v-for="s in openQueuesHere" :key="s.id" class="queue-card">
          <div>
            <span class="queue-count">{{ s.queue.inLine }}</span>
            <span class="muted small"> in line · {{ s.queue.seatsLeft }} seats left</span>
            <div class="muted small">{{ dateParts(s.date).day }} {{ timeLabel(s.time) }} · {{ venueById(s.venue)?.name }}</div>
          </div>
          <span class="label" :class="`tone-${s.label.tone}`">{{ s.label.text }}</span>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Directed by</h2>
      <div class="directors">
        <div v-for="d in directors" :key="d" class="director">
          <div class="initials-tile">{{ initials(d) }}</div>
          <span class="director-name">{{ d }}</span>
        </div>
      </div>
      <dl class="facts">
        <template v-if="film.cast"><dt>Cast</dt><dd>{{ film.cast }}</dd></template>
        <template v-if="film.country"><dt>Country</dt><dd>{{ film.country }}</dd></template>
        <template v-if="film.language"><dt>Language</dt><dd>{{ film.language }}</dd></template>
        <dt>Programme</dt><dd>{{ film.section }}</dd>
      </dl>
    </section>

    <!-- Sideways row of other films in the same programme section -->
    <section v-if="more.length" class="section">
      <div class="section-head">
        <h2 class="section-title">More from {{ film.section }}</h2>
        <NuxtLink to="/programme/films" class="link">See all <ChevronRightIcon :size="18" /></NuxtLink>
      </div>
      <div class="more-row">
        <NuxtLink v-for="f in more" :key="f.id" :to="`/film/${f.id}`" class="more-film">
          <FilmPoster :film="f" class="more-poster"><span v-if="!f.image" class="more-poster-title">{{ f.title }}</span></FilmPoster>
          <span class="more-title">{{ f.title }}</span>
          <span class="muted small">{{ runtimeLabel(f.runtime) }}</span>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
