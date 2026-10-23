<script setup lang="ts">
import { venueShort } from '~/lib/today'
import { computed, watch } from 'vue'
import { UsersIcon } from 'lucide-vue-next'
import { VENUES, filmById } from '~/data/programme'
import { queueLabel, timeLabel } from '~/lib/format'
import { isSampleQueues, minutesAgo, openQueues, queueFeed, recentUpdates, useLiveClock, type OpenQueue } from '~/lib/queues'
import type { Tone } from '~/types/festival'
import type { BadgeTone } from '~/components/ui/UiBadge.vue'
import { useFestival } from '~/lib/store'

// QUEUES: lines being counted right now by door volunteers, a pin per venue,
// and the latest counts. Updates by itself.
useHead({ title: 'Queues' })
const t = useLiveClock()
const online = useOnline()
// film title and label worked out once per row
const withInfo = (x: OpenQueue) => ({ ...x, title: filmById(x.screening.film)?.title ?? '', venueName: venueShort(x.screening.venue), label: queueLabel(x.queue) ?? { text: '', tone: 'muted' as Tone } })
const open = computed(() => openQueues(t.value).map(withInfo))
const updates = computed(() => recentUpdates(t.value).map(withInfo))
const BADGE: Record<Tone, BadgeTone> = { good: 'success', gold: 'accent', alert: 'danger', muted: 'neutral' }

const { markQueuesChecked } = useFestival()
watch(() => open.value.map((x) => x.screening.id).join(','), (ids) => { if (ids) markQueuesChecked(ids.split(',')) }, { immediate: true })

const TONE_BG: Record<Tone, string> = { muted: 'border-line bg-surface', good: 'border-success/40 bg-success-soft', gold: 'border-accent/40 bg-accent-soft', alert: 'border-danger/40 bg-danger-soft' }
// One pin per venue, coloured by the soonest open queue there
const pins = computed(() => VENUES.map((v) => {
  const here = open.value.filter((x) => x.screening.venue === v.id)
  const label = here[0] ? queueLabel(here[0].queue) : null
  return { v, label, n: here.length }
}))
</script>

<template>
  <div>
    <PageTitle title="Queues" :icon="UsersIcon" description="See how long each line is before you head over. Counts are posted by AFRIFF door volunteers." />

    <section class="mt-7">
      <UiBadge v-if="isSampleQueues() || (online && queueFeed.live)" tone="success"><span class="pulse" aria-hidden="true" /> Live</UiBadge>
      <UiBadge v-else tone="neutral">Last counts</UiBadge>
      <h2 class="mt-1.5 font-display text-h2 font-semibold">Queues open now</h2>
      <p class="text-meta text-muted">Screenings where door volunteers are counting the line</p>

      <p v-if="open.length === 0" class="py-6 text-muted">No queues being counted right now. Volunteers start counting when each queue opens.</p>
      <template v-else>
        <div class="mt-3 grid grid-cols-3 gap-2">
          <div v-for="pin in pins" :key="pin.v.id" class="flex flex-col gap-1 rounded-tile border p-2.5" :class="pin.label ? TONE_BG[pin.label.tone] : 'border-line bg-surface'">
            <span class="flex items-center gap-1.5 truncate text-meta font-semibold"><VenueDot :venue-id="pin.v.id" /> {{ pin.v.name.replace('Filmhouse ', '') }}</span>
            <span class="text-label" :class="pin.label ? `tone-${pin.label.tone}` : 'text-muted'">{{ pin.label ? `${pin.label.text} · ${pin.n} line${pin.n > 1 ? 's' : ''}` : 'No lines' }}</span>
          </div>
        </div>
        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-label text-muted">
          <span class="inline-flex items-center gap-1.5"><i class="size-2 rounded-full bg-success" /> Good chance</span>
          <span class="inline-flex items-center gap-1.5"><i class="size-2 rounded-full bg-accent" /> Tight</span>
          <span class="inline-flex items-center gap-1.5"><i class="size-2 rounded-full bg-danger" /> Unlikely / Full</span>
        </div>

        <div class="mt-4 flex flex-col gap-2.5">
          <NuxtLink v-for="{ screening: s, queue, title, label } in open" :key="s.id" :to="`/film/${s.film}`" class="card card-interactive flex flex-col gap-1.5 p-3.5">
            <div class="flex items-start justify-between gap-3">
              <span class="text-body font-semibold">{{ title }}</span>
              <UiBadge :tone="BADGE[label.tone]" class="px-2! py-0.5! text-label! font-semibold!">{{ label.text }}</UiBadge>
            </div>
            <span class="flex flex-wrap items-center gap-x-1.5 text-meta text-muted">{{ timeLabel(s.time) }} · <VenueLine :venue-id="s.venue" :screen="s.screen" />{{ s.tag === 'Industry' ? ' · Industry' : '' }}</span>
            <div class="flex items-baseline gap-4 text-meta text-muted">
              <span><strong class="font-display text-h3 font-semibold text-ink tabular-nums">{{ queue.inLine }}</strong> in line</span>
              <span><strong class="font-display text-h3 font-semibold text-ink tabular-nums">{{ queue.seatsLeft }}</strong> seats left</span>
              <span class="ml-auto text-label">{{ minutesAgo(t, queue.updatedAt) }}</span>
            </div>
          </NuxtLink>
        </div>
      </template>
    </section>

    <section class="mt-8">
      <h2 class="font-display text-h2 font-semibold">Recent updates</h2>
      <p class="text-meta text-muted">Latest counts first</p>
      <p v-if="updates.length === 0" class="py-6 text-muted">No counts posted yet.</p>
      <div v-else class="card mt-3 divide-y divide-line">
        <div v-for="{ screening: s, queue, title, venueName, label } in updates" :key="`${s.id}-${queue.updatedAt}`" class="flex items-center gap-3 px-3.5 py-3">
          <span class="w-16 shrink-0 text-label text-muted">{{ minutesAgo(t, queue.updatedAt) }}</span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="truncate text-meta font-semibold">{{ title }}</span>
            <span class="truncate text-label text-muted">{{ venueName }} · {{ queue.inLine }} in line · {{ queue.seatsLeft }} seats</span>
          </span>
          <span class="shrink-0 text-label font-semibold" :class="`tone-${label.tone}`">{{ label.text }}</span>
        </div>
      </div>
    </section>

    <p v-if="!online && !isSampleQueues()" class="mt-6 rounded-tile bg-raised px-3 py-2 text-center text-meta text-muted">
      You’re offline. These are the last counts this phone received; they’ll update by themselves when you’re back online.
    </p>
    <p class="mt-6 text-center text-label text-subtle">{{ isSampleQueues() ? 'Sample counts for testing.' : queueFeed.live ? 'Counts update live as volunteers count.' : 'Counts update live as volunteers count, during screening hours.' }} Times are samples until the festival schedule is published.</p>
  </div>
</template>
