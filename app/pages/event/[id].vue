<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRightIcon, CheckIcon, ChevronLeftIcon, ClockIcon, NavigationIcon, PlusIcon, TicketIcon } from 'lucide-vue-next'
import { EVENT_TYPES, eventById, isMultiDay } from '~/data/events'
import { venueById } from '~/data/programme'
import { dateParts, directionsUrl, initials, timeLabel, toMinutes } from '~/lib/format'
import { useFestival } from '~/lib/store'

// EVENT PAGE: masterclasses, workshops, market days, galas, parties.
const route = useRoute()
const router = useRouter()
const event = computed(() => eventById(String(route.params.id)))
useHead({ title: () => event.value?.title.split(':')[0] || 'Event' })
const { isScheduled, toggleScheduled } = useFestival()

// Everything the page shows that's worked out from the event (null when it doesn't exist)
const info = computed(() => {
  const e = event.value
  if (!e) return null
  const p = dateParts(e.date)
  const multi = isMultiDay(e)
  let mins = toMinutes(e.end) - toMinutes(e.time)
  if (mins <= 0) mins += 24 * 60 // runs past midnight
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return {
    type: EVENT_TYPES[e.type],
    multi,
    p,
    venue: e.venue ? venueById(e.venue) ?? null : null,
    duration: h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`,
    dayLine: multi && e.endDate ? `– ${String(dateParts(e.endDate).date).padStart(2, '0')} ${p.monthUpper}` : `${p.month} ${p.day}`,
  }
})

function back() {
  if (window.history.state?.back) router.back()
  else router.push('/programme/events')
}
</script>

<template>
  <div v-if="!event">
    <UiEmptyState title="We couldn't find that event" description="It may have been removed from the programme.">
      <UiButton to="/programme/events" variant="secondary">Back to events</UiButton>
    </UiEmptyState>
  </div>

  <article v-else-if="info" :key="event.id">
    <div class="mb-4 flex items-center justify-between gap-2">
      <button type="button" class="pressable -ml-2 inline-flex h-9 items-center gap-1 rounded-full pr-3 pl-1.5 text-meta font-medium text-muted hover:bg-hover hover:text-ink" @click="back">
        <ChevronLeftIcon class="size-5" /> Back
      </button>
      <span class="flex gap-1.5">
        <UiBadge>{{ info.type.label }}</UiBadge>
        <UiBadge><ClockIcon /> {{ info.duration }}</UiBadge>
      </span>
    </div>

    <!-- the whole graphic, never cropped (same frame as film posters) -->
    <div v-if="event.image" class="relative mx-auto w-[min(64%,17rem)] overflow-hidden rounded-card bg-raised shadow-card outline -outline-offset-1 outline-white/10">
      <img :src="event.image" :alt="event.title" decoding="async" class="block h-auto w-full" />
    </div>
    <div v-else class="grain relative flex aspect-[16/9] items-center justify-center gap-3 overflow-hidden rounded-card border border-line bg-surface">
      <EventThumb :event="event" icon-size="size-10" class="size-20 rounded-card" />
    </div>

    <p class="mt-5 eyebrow text-accent-ink">{{ info.type.label }}</p>
    <h1 class="mt-1 font-display text-h1 font-semibold" :class="event.status === 'cancelled' && 'text-muted line-through'">{{ event.title }}</h1>
    <div class="mt-2 flex flex-wrap items-center gap-2 text-meta text-muted">
      <StatusTag :status="event.status" />
      <span v-if="event.access" class="inline-flex items-center gap-1.5"><TicketIcon class="size-4 text-accent-ink" /> {{ event.access }}</span>
    </div>

    <UiButton v-if="event.link?.url" :href="event.link.url" block class="mt-4">
      {{ event.link.label || 'More on afriff.com' }} <ArrowUpRightIcon />
    </UiButton>

    <section class="mt-8">
      <h2 class="mb-2 font-display text-h2 font-semibold">About</h2>
      <p class="text-prose text-ink/90">{{ event.about }}</p>
    </section>

    <!-- awards: show who decides the winners -->
    <JuryRow v-if="event.type === 'awards'" title="The jury" intro="These are the people choosing this year's Globe Award winners. Tap a face to read about them." />

    <section class="mt-8">
      <h2 class="mb-3 font-display text-h2 font-semibold">When &amp; where</h2>
      <div class="card flex flex-col gap-1 p-4">
        <div class="flex items-baseline gap-2">
          <span class="font-display text-h1 leading-none font-semibold tabular-nums">{{ String(info.p.date).padStart(2, '0') }}</span>
          <span class="eyebrow text-muted">{{ info.dayLine }}</span>
        </div>
        <span class="mt-1 text-body font-semibold tabular-nums">{{ info.multi ? 'Evenings from ' : '' }}{{ timeLabel(event.time) }} – {{ timeLabel(event.end) }}</span>
        <VenueLine :venue-id="event.venue" :place="event.place" />
        <span v-if="info.venue" class="text-label text-muted">{{ event.place }}</span>
        <UiBadge v-if="event.tag === 'Industry'" tone="info" class="mt-1">Industry</UiBadge>
      </div>
      <div class="mt-2.5 flex flex-wrap gap-2">
        <UiButton v-if="!info.multi" :variant="isScheduled(event.id) ? 'primary' : 'secondary'" :aria-pressed="isScheduled(event.id)" @click="toggleScheduled(event.id)">
          <template v-if="isScheduled(event.id)"><CheckIcon /> Scheduled</template>
          <template v-else><PlusIcon /> Schedule</template>
        </UiButton>
        <UiButton v-if="info.venue" variant="secondary" :href="directionsUrl(info.venue.address)"><NavigationIcon /> Directions</UiButton>
      </div>
      <p class="mt-2.5 text-label text-subtle">Times and rooms are samples until AFRIFF publishes the schedule.</p>
    </section>

    <section v-if="event.speaker" class="mt-8">
      <h2 class="mb-3 font-display text-h2 font-semibold">With</h2>
      <div class="flex items-start gap-3">
        <div class="grid size-12 shrink-0 place-items-center rounded-tile border border-line bg-raised font-display text-h3 font-semibold text-muted">{{ initials(event.speaker.replace(/\(.*\)/, '')) }}</div>
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="text-body font-semibold">{{ event.speaker }}</span>
          <span class="text-meta text-muted">{{ event.speakerRole }}</span>
          <p v-if="event.bio" class="mt-2 text-prose text-ink/90">{{ event.bio }}</p>
        </div>
      </div>
    </section>
  </article>
</template>
