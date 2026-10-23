<script setup>
import { computed } from 'vue'
import { ClockIcon } from 'lucide-vue-next'
import { DAY_THEMES, filmById } from '~/data/programme.js'
import { dateParts, timeLabel } from '~/lib/format.js'
import { dayInfo, venueShort } from '~/lib/today.js'
import { openProgrammeDay } from '~/lib/programmeMemory.js'

// HOME BANNER DURING THE FESTIVAL (1–7 Nov): changes every day.
// Day N of 7 + theme, a collage of the day's films (team-picked first,
// then automatic), what's on today, what's next, and "See today".
const props = defineProps({ day: { type: String, required: true }, t: { type: Number, required: true } })

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const d = computed(() => dayInfo(props.day, props.t))
const p = computed(() => dateParts(props.day))
const counts = computed(() => [
  d.value.counts.screenings && plural(d.value.counts.screenings, 'screening'),
  d.value.counts.learn && plural(d.value.counts.learn, 'masterclass', 'masterclasses'),
  d.value.counts.other && plural(d.value.counts.other, 'event'),
].filter(Boolean))

// collage: big poster on the left; the rest fill a 2 x 2 grid (or a column when fewer)
const collage = computed(() => {
  const films = d.value.films
  if (!films.length) return null
  const many = films.length > 5
  const shown = many ? films.slice(0, 4) : films.slice(0, 5)
  const n = shown.length + (many ? 1 : 0)
  const style = n >= 5
    ? { gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '1fr 1fr' }
    : { gridTemplateColumns: n === 1 ? '1fr' : '2fr 1fr', gridTemplateRows: `repeat(${Math.max(1, n - 1)}, 1fr)` }
  const [lead, ...rest] = shown
  return { style, lead, rest, more: many ? films.length - 4 : 0, total: films.length }
})

const next = computed(() => {
  const n = d.value.upcoming[0]
  if (!n) return null
  const item = n.item
  return {
    title: n.kind === 'screening' ? filmById(item.film)?.title : item.title.split(':')[0],
    where: item.venue ? venueShort(item.venue) : item.place,
    href: n.kind === 'screening' ? `/film/${item.film}` : `/event/${item.id}`,
    time: timeLabel(item.time),
  }
})
const seeToday = () => openProgrammeDay(props.day)
</script>

<template>
  <HeroCard>
    <div class="flex items-baseline justify-between gap-2">
      <span class="text-micro font-semibold tracking-[0.12em] text-gold-300 uppercase">Today · Day {{ d.index + 1 }} of {{ d.total }}</span>
      <span class="text-label whitespace-nowrap text-white/70">{{ p.day }} {{ p.date }} {{ p.month }}</span>
    </div>
    <h2 v-if="d.theme" class="mt-1.5 mb-3 font-display text-2xl leading-7 font-semibold tracking-tight">{{ d.theme }}</h2>

    <div v-if="collage" class="grid h-48 gap-1.5" :style="collage.style">
      <NuxtLink :to="`/film/${collage.lead.id}`" class="relative block min-h-0 min-w-0 overflow-hidden rounded-tile bg-raised" style="grid-row: 1 / -1">
        <FilmPoster :film="collage.lead" class="absolute inset-0 size-full" />
        <span class="absolute inset-x-0 top-2/5 bottom-0 z-2 bg-gradient-to-b from-transparent to-navy-950/95" aria-hidden="true" />
        <span class="absolute inset-x-2.5 bottom-2 z-3 line-clamp-2 text-body leading-tight font-semibold">{{ collage.lead.title }}</span>
      </NuxtLink>
      <NuxtLink v-for="f in collage.rest" :key="f.id" :to="`/film/${f.id}`" class="relative block min-h-0 min-w-0 overflow-hidden rounded-tile bg-raised" :aria-label="f.title">
        <FilmPoster :film="f" class="absolute inset-0 size-full" />
      </NuxtLink>
      <NuxtLink
        v-if="collage.more"
        to="/programme"
        class="grid min-h-0 min-w-0 place-items-center rounded-tile border border-white/15 bg-white/5 font-display text-h2 font-semibold text-gold-300"
        :aria-label="`See all ${collage.total} films today`"
        @click="seeToday"
      >+{{ collage.more }}</NuxtLink>
    </div>

    <div v-if="counts.length" class="mt-3 flex flex-wrap gap-1.5">
      <span v-for="c in counts" :key="c" class="rounded-tag bg-white/8 px-2 py-0.5 text-label font-semibold text-gold-300">{{ c }}</span>
    </div>

    <NuxtLink v-if="next" :to="next.href" class="mt-3 flex items-center gap-2 rounded-tile bg-white/5 px-3 py-2.5 text-meta">
      <ClockIcon class="size-4 shrink-0 text-gold-300" />
      <span><span class="text-white/65">Next up</span> · {{ next.time }} · <strong class="font-semibold">{{ next.title }}</strong>{{ next.where ? ` · ${next.where}` : '' }}</span>
    </NuxtLink>
    <p v-else-if="d.tomorrow" class="mt-3 rounded-tile bg-white/5 px-3 py-2.5 text-meta text-white/70">That's a wrap for today. Tomorrow: {{ DAY_THEMES[d.tomorrow] || 'more films' }}.</p>
    <p v-else class="mt-3 rounded-tile bg-white/5 px-3 py-2.5 text-meta text-white/70">That's a wrap on AFRIFF 2026. Thank you for coming!</p>

    <UiButton to="/programme" block class="mt-4" @click="seeToday">See today</UiButton>
  </HeroCard>
</template>
