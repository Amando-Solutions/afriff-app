<script setup>
import { computed, watch } from 'vue'
import { UsersIcon } from 'lucide-vue-next'
import { VENUES, filmById, venueById } from '~/data/programme.js'
import { queueLabel, timeLabel } from '~/lib/format.js'
import { isSampleQueues, minutesAgo, openQueues, recentUpdates, useLiveClock } from '~/lib/queues.js'
import { useFestival } from '~/lib/store.js'

// QUEUES: lines being counted right now by door volunteers, a pin per venue,
// and the latest counts. Updates by itself.
useHead({ title: 'Queues' })
const t = useLiveClock()
const open = computed(() => openQueues(t.value))
const updates = computed(() => recentUpdates(t.value))

const { markQueuesChecked } = useFestival()
watch(() => open.value.map((x) => x.screening.id).join(','), (ids) => { if (ids) markQueuesChecked(ids.split(',')) }, { immediate: true })

const TONE_BG = { good: 'border-success/40 bg-success-soft', gold: 'border-accent/40 bg-accent-soft', alert: 'border-danger/40 bg-danger-soft' }
// One pin per venue, coloured by the soonest open queue there
const pins = computed(() => VENUES.map((v) => {
  const here = open.value.filter((x) => x.screening.venue === v.id)
  const label = here.length ? queueLabel(here[0].queue) : null
  return { v, label, n: here.length }
}))
</script>

<template>
  <div>
    <PageTitle title="Queues" :icon="UsersIcon" description="See how long each line is before you head over. Counts are posted by AFRIFF door volunteers." />

    <section class="mt-7">
      <span class="inline-flex items-center gap-1.5 rounded-tag bg-success-soft px-1.5 py-px text-micro font-semibold tracking-wider text-success"><span class="pulse" aria-hidden="true" /> LIVE</span>
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
          <NuxtLink v-for="{ screening: s, queue } in open" :key="s.id" :to="`/film/${s.film}`" class="card card-interactive flex flex-col gap-1.5 p-3.5">
            <div class="flex items-start justify-between gap-3">
              <span class="text-body font-semibold">{{ filmById(s.film).title }}</span>
              <span class="shrink-0 text-meta font-semibold" :class="`tone-${queueLabel(queue).tone}`">{{ queueLabel(queue).text }}</span>
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
      <span class="inline-flex items-center gap-1.5 rounded-tag bg-success-soft px-1.5 py-px text-micro font-semibold tracking-wider text-success"><span class="pulse" aria-hidden="true" /> LIVE</span>
      <h2 class="mt-1.5 font-display text-h2 font-semibold">Recent updates</h2>
      <p class="text-meta text-muted">Latest counts first</p>
      <p v-if="updates.length === 0" class="py-6 text-muted">No counts posted yet.</p>
      <div v-else class="card mt-3 divide-y divide-line">
        <div v-for="{ screening: s, queue } in updates" :key="`${s.id}-${queue.updatedAt}`" class="flex items-center gap-3 px-3.5 py-3">
          <span class="w-16 shrink-0 text-label text-muted">{{ minutesAgo(t, queue.updatedAt) }}</span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="truncate text-meta font-semibold">{{ filmById(s.film).title }}</span>
            <span class="truncate text-label text-muted">{{ venueById(s.venue).name }} · {{ queue.inLine }} in line · {{ queue.seatsLeft }} seats left</span>
          </span>
          <span class="shrink-0 text-label font-semibold" :class="`tone-${queueLabel(queue).tone}`">{{ queueLabel(queue).text }}</span>
        </div>
      </div>
    </section>

    <p class="mt-6 text-center text-label text-subtle">{{ isSampleQueues() ? 'Sample counts for testing.' : 'Counts update about every minute.' }} Times are samples until the festival schedule is published.</p>
  </div>
</template>
