<script setup lang="ts">
import { computed, reactive } from 'vue'
import { ClockIcon } from 'lucide-vue-next'
import { DAY_THEMES, SCREENINGS, filmById } from '@afriff/core/data/programme'
import { dateParts, screeningStart, timeLabel } from '@afriff/core/utils/format'
import { dayInfo, venueShort } from '~/lib/today'
import { openProgrammeDay } from '~/lib/programmeMemory'

// HOME BANNER DURING THE FESTIVAL (1–7 Nov): changes every day.
// "Daily highlights" (the same headline every day), Day N of 7, a swipeable
// filmstrip of the day's films (team-picked first, then automatic), what's
// on today, what's next, and "See today".
const props = defineProps<{ day: string; t: number }>()

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const d = computed(() => dayInfo(props.day, props.t))
const p = computed(() => dateParts(props.day))
const counts = computed(() => [
  d.value.counts.screenings && plural(d.value.counts.screenings, 'screening'),
  d.value.counts.learn && plural(d.value.counts.learn, 'masterclass', 'masterclasses'),
  d.value.counts.other && plural(d.value.counts.other, 'event'),
].filter(Boolean))

// Filmstrip: every film showing today, with its next time today
const strip = computed(() => d.value.films.map((film) => {
  const upcoming = SCREENINGS.filter((s) => s.film === film.id && s.date === props.day && s.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time))
    .find((s) => screeningStart(s).getTime() > props.t)
  return { film, when: upcoming ? timeLabel(upcoming.time) : 'Shown earlier' }
}))
// posters whose link broke fall back to the colour card
const broken = reactive<Record<string, boolean>>({})

const next = computed(() => {
  const n = d.value.upcoming[0]
  if (!n) return null
  if (n.kind === 'screening') {
    const s = n.item
    return { title: filmById(s.film)?.title ?? '', where: venueShort(s.venue), href: `/film/${s.film}`, time: timeLabel(s.time) }
  }
  const e = n.item
  return { title: e.title.split(':')[0], where: e.venue ? venueShort(e.venue) : e.place, href: `/event/${e.id}`, time: timeLabel(e.time) }
})
const seeToday = () => openProgrammeDay(props.day)
</script>

<template>
  <section class="hero hl">
    <div class="hl-top">
      <span class="hero-eyebrow">Today · Day {{ d.index + 1 }} of {{ d.total }}</span>
      <span class="hl-date">{{ p.day }} {{ p.date }} {{ p.month }}</span>
    </div>
    <h2 class="hl-title">Daily highlights</h2>

    <!-- whole posters at one height (never cropped), swipe sideways -->
    <div v-if="strip.length" class="filmstrip" role="list" aria-label="Films showing today">
      <NuxtLink v-for="{ film, when } in strip" :key="film.id" :to="`/film/${film.id}`" role="listitem" class="strip-film">
        <img
          v-if="film.image && !broken[film.id]"
          :src="film.image"
          alt=""
          loading="lazy"
          decoding="async"
          class="strip-poster"
          @error="broken[film.id] = true"
        />
        <FilmPoster v-else :film="{ ...film, image: '' }" class="strip-poster-art">
          <span class="strip-poster-title">{{ film.title }}</span>
        </FilmPoster>
        <span class="strip-title">{{ film.title }}</span>
        <span class="strip-when">{{ when }}</span>
      </NuxtLink>
      <NuxtLink to="/programme" class="strip-more" @click="seeToday">See all<br />{{ strip.length }} films</NuxtLink>
    </div>

    <div v-if="counts.length" class="hl-counts">
      <span v-for="c in counts" :key="String(c)" class="hl-count">{{ c }}</span>
    </div>

    <NuxtLink v-if="next" :to="next.href" class="hl-next">
      <ClockIcon :size="16" />
      <span><span class="muted">Next up</span> · {{ next.time }} · <strong>{{ next.title }}</strong>{{ next.where ? ` · ${next.where}` : '' }}</span>
    </NuxtLink>
    <p v-else-if="d.tomorrow" class="hl-next done">That's a wrap for today. Tomorrow: {{ DAY_THEMES[d.tomorrow] || 'more films' }}.</p>
    <p v-else class="hl-next done">That's a wrap on AFRIFF 2026. Thank you for coming!</p>

    <NuxtLink to="/programme" class="btn btn-gold hero-cta" @click="seeToday">See today</NuxtLink>
  </section>
</template>
