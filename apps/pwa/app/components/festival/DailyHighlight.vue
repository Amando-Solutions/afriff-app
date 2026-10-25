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

// filmstrip: every film showing today, with its next time today
const strip = computed(() => d.value.films.map((film) => {
  const times = SCREENINGS.filter((s) => s.film === film.id && s.date === props.day && s.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time))
  const upcoming = times.find((s) => screeningStart(s).getTime() > props.t)
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
  <HeroCard>
    <div class="flex items-baseline justify-between gap-2">
      <span class="eyebrow text-gold-300">Today · Day {{ d.index + 1 }} of {{ d.total }}</span>
      <span class="text-label whitespace-nowrap text-white/70">{{ p.day }} {{ p.date }} {{ p.month }}</span>
    </div>
    <h2 class="mt-1.5 mb-3 font-display text-2xl leading-7 font-semibold tracking-tight">Daily highlights</h2>

    <!-- whole posters at one height (never cropped), swipe sideways -->
    <div v-if="strip.length" class="scroll-row gap-2.5 pb-0.5" role="list" aria-label="Films showing today">
      <NuxtLink
        v-for="{ film, when } in strip"
        :key="film.id"
        :to="`/film/${film.id}`"
        role="listitem"
        class="flex max-w-30 shrink-0 snap-start flex-col gap-0.5"
      >
        <img
          v-if="film.image && !broken[film.id]"
          :src="film.image"
          alt=""
          loading="lazy"
          decoding="async"
          class="block h-39 w-auto max-w-30 min-w-20 rounded-tile bg-raised object-contain"
          @error="broken[film.id] = true"
        />
        <FilmPoster v-else :film="{ ...film, image: '' }" class="flex h-39 w-26 items-end rounded-tile">
          <span class="relative z-2 p-2 text-label leading-tight font-semibold">{{ film.title }}</span>
        </FilmPoster>
        <span class="mt-1 line-clamp-2 text-label leading-tight font-semibold">{{ film.title }}</span>
        <span class="text-label font-semibold text-gold-300">{{ when }}</span>
      </NuxtLink>
      <NuxtLink
        to="/programme"
        class="grid h-39 w-22 shrink-0 snap-start place-items-center rounded-tile border border-white/15 bg-white/5 text-center text-meta leading-snug font-semibold text-gold-300"
        @click="seeToday"
      >See all<br />{{ strip.length }} films</NuxtLink>
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
