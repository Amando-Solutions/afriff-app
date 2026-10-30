<script setup lang="ts">
import { computed, reactive } from 'vue'
import { ChevronRightIcon } from 'lucide-vue-next'
import { SCREENINGS } from '@afriff/core/data/programme'
import { screeningStart, timeLabel } from '@afriff/core/utils/format'
import { dayInfo } from '~/lib/today'
import { openProgrammeDay } from '~/lib/programmeMemory'

// HOME BANNER DURING THE FESTIVAL (1–7 Nov), laid out like the designer's
// "Home · festival day" screen in the app's own look: the date, "Day N of 7"
// with a bar per day, "Today's highlights" (a swipeable filmstrip of every film
// showing today, team-picked first, then automatic), what's on today, and
// "See today's programme". (The countdown to what starts next is on My
// Festival now, for the person's own plan: "Upcoming" in pages/my.vue.)
const props = defineProps<{ day: string; t: number }>()

const d = computed(() => dayInfo(props.day, props.t))

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dateLine = computed(() => {
  const [y = 1970, m = 1, dd = 1] = props.day.split('-').map(Number)
  return `${DAY_NAMES[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()]} ${dd} ${MONTH_NAMES[m - 1]}`
})

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const counts = computed(() => [
  d.value.counts.screenings && plural(d.value.counts.screenings, 'screening'),
  d.value.counts.afcm && plural(d.value.counts.afcm, 'AFCM session'),
  d.value.counts.learn && plural(d.value.counts.learn, 'masterclass', 'masterclasses'),
  d.value.counts.other && plural(d.value.counts.other, 'event'),
].filter(Boolean))

// Today's highlights: every film showing today, with its next time today
const strip = computed(() => d.value.films.map((film) => {
  const upcoming = SCREENINGS.filter((s) => s.film === film.id && s.date === props.day && s.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time))
    .find((s) => screeningStart(s).getTime() > props.t)
  return { film, when: upcoming ? timeLabel(upcoming.time) : 'Shown earlier' }
}))
// posters whose link broke fall back to the colour card
const broken = reactive<Record<string, boolean>>({})

const seeToday = () => openProgrammeDay(props.day)
</script>

<template>
  <section class="hero hl">
    <p class="hero-eyebrow">{{ dateLine }}</p>
    <h2 class="hl-title">Day {{ d.index + 1 }} <span class="muted">of {{ d.total }}</span></h2>
    <div class="hl-days" role="img" :aria-label="`Day ${d.index + 1} of ${d.total}`">
      <span v-for="n in d.total" :key="n" :class="{ past: n < d.index + 1, on: n === d.index + 1 }" />
    </div>

    <template v-if="strip.length">
      <div class="hl-head">
        <h2>Today's highlights</h2>
        <NuxtLink to="/programme" class="link" @click="seeToday">See all <ChevronRightIcon :size="18" /></NuxtLink>
      </div>
      <!-- whole posters at one height (never cropped), swipe sideways -->
      <div class="filmstrip" role="list" aria-label="Films showing today">
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
      </div>
    </template>

    <div v-if="counts.length" class="hl-counts">
      <span v-for="c in counts" :key="String(c)" class="hl-count">{{ c }}</span>
    </div>

    <NuxtLink to="/programme" class="btn btn-gold hero-cta" @click="seeToday">See today's programme</NuxtLink>
  </section>
</template>
