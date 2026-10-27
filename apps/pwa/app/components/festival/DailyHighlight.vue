<script setup lang="ts">
import { computed } from 'vue'
import { ClockIcon } from 'lucide-vue-next'
import { DAY_THEMES, filmById } from '@afriff/core/data/programme'
import { dateParts, timeLabel } from '@afriff/core/utils/format'
import { dayInfo, venueShort } from '~/lib/today'
import { openProgrammeDay } from '~/lib/programmeMemory'

// HOME BANNER DURING THE FESTIVAL (1–7 Nov): changes every day.
// Day N of 7 + theme, a collage of the day's films (team-picked first,
// then automatic), what's on today, what's next, and "See today".
const props = defineProps<{ day: string; t: number }>()

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const d = computed(() => dayInfo(props.day, props.t))
const p = computed(() => dateParts(props.day))
const counts = computed(() => [
  d.value.counts.screenings && plural(d.value.counts.screenings, 'screening'),
  d.value.counts.learn && plural(d.value.counts.learn, 'masterclass', 'masterclasses'),
  d.value.counts.other && plural(d.value.counts.other, 'event'),
].filter(Boolean))

// Collage: big poster on the left; the rest fill a 2 x 2 grid (or a column when fewer)
const collage = computed(() => {
  const films = d.value.films
  if (films.length === 0) return null
  const many = films.length > 5
  const shown = many ? films.slice(0, 4) : films.slice(0, 5)
  const n = shown.length + (many ? 1 : 0)
  const style = n >= 5
    ? { gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '1fr 1fr' }
    : { gridTemplateColumns: n === 1 ? '1fr' : '2fr 1fr', gridTemplateRows: `repeat(${Math.max(1, n - 1)}, 1fr)` }
  const [lead, ...rest] = shown
  return { lead: lead!, rest, many, total: films.length, style }
})

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
    <h2 v-if="d.theme" class="hl-theme">{{ d.theme }}</h2>

    <div v-if="collage" class="collage" :style="collage.style">
      <NuxtLink :to="`/film/${collage.lead.id}`" class="collage-tile lead" style="grid-row: 1 / -1">
        <FilmPoster :film="collage.lead" class="collage-poster" />
        <span class="collage-lead-title">{{ collage.lead.title }}</span>
      </NuxtLink>
      <NuxtLink v-for="f in collage.rest" :key="f.id" :to="`/film/${f.id}`" class="collage-tile" :aria-label="f.title">
        <FilmPoster :film="f" class="collage-poster" />
      </NuxtLink>
      <NuxtLink
        v-if="collage.many"
        to="/programme"
        class="collage-tile collage-more"
        :aria-label="`See all ${collage.total} films today`"
        @click="seeToday"
      >+{{ collage.total - 4 }}</NuxtLink>
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
