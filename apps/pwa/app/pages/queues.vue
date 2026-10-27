<script setup lang="ts">
import { computed, watch } from 'vue'
import { UsersIcon } from 'lucide-vue-next'
import { VENUES, filmById, venueById } from '@afriff/core/data/programme'
import { queueLabel, timeLabel } from '@afriff/core/utils/format'
import { isSampleQueues, minutesAgo, openQueues, queueFeed, recentUpdates, useLiveClock, type OpenQueue } from '~/lib/queues'
import type { Tone } from '@afriff/core/types/festival'
import { useFestival } from '~/lib/store'

// QUEUES: lines being counted right now by door volunteers, a pin per venue,
// and the latest counts. Updates by itself.
useHead({ title: 'Queues' })
const t = useLiveClock()
const online = useOnline()
// film title and label worked out once per row
const withInfo = (x: OpenQueue) => ({ ...x, title: filmById(x.screening.film)?.title ?? '', venueName: venueById(x.screening.venue)?.name ?? '', label: queueLabel(x.queue) ?? { text: '', tone: 'muted' as Tone } })
const open = computed(() => openQueues(t.value).map(withInfo))
const updates = computed(() => recentUpdates(t.value).map(withInfo))

const { markQueuesChecked } = useFestival()
watch(() => open.value.map((x) => x.screening.id).join(','), (ids) => { if (ids) markQueuesChecked(ids.split(',')) }, { immediate: true })

// One pin per venue, coloured by the soonest open queue there
const pins = computed(() => VENUES.map((v) => {
  const here = open.value.filter((x) => x.screening.venue === v.id)
  const label = here[0] ? queueLabel(here[0].queue) : null
  return { v, label, n: here.length }
}))
</script>

<template>
  <div class="page">
    <PageTitle title="Queues" :icon="UsersIcon" />
    <p class="muted">See how long each line is before you head over. Counts are posted by AFRIFF door volunteers.</p>

    <section class="section">
      <span v-if="isSampleQueues() || (online && queueFeed.live)" class="live-tag"><span class="pulse" aria-hidden="true" /> LIVE</span>
      <span v-else class="label tone-muted">LAST COUNTS</span>
      <h2 class="live-title">Queues open now</h2>
      <p class="muted small">Screenings where door volunteers are counting the line</p>

      <p v-if="open.length === 0" class="empty">No queues being counted right now. Volunteers start counting when each queue opens.</p>
      <template v-else>
        <!-- One pin per venue, coloured by the soonest open queue there (map-lite) -->
        <div class="venue-pins">
          <div class="venue-pins-row">
            <div v-for="pin in pins" :key="pin.v.id" class="venue-pin" :class="pin.label ? `tone-bg-${pin.label.tone}` : ''">
              <span class="venue-pin-name"><VenueDot :venue-id="pin.v.id" /> {{ pin.v.name.replace('Filmhouse ', '') }}</span>
              <span class="venue-pin-state">{{ pin.label ? `${pin.label.text} · ${pin.n} line${pin.n > 1 ? 's' : ''}` : 'No lines' }}</span>
            </div>
          </div>
          <div class="legend">
            <span><i class="tone-bg-good" /> Good chance</span>
            <span><i class="tone-bg-gold" /> Tight</span>
            <span><i class="tone-bg-alert" /> Unlikely / Full</span>
          </div>
        </div>
        <div class="stack" style="margin-top: 14px">
          <NuxtLink v-for="{ screening: s, queue, title, label } in open" :key="s.id" :to="`/film/${s.film}`" class="queue-row">
            <div class="queue-row-top">
              <span class="row-title">{{ title }}</span>
              <span class="label" :class="`tone-${label.tone}`">{{ label.text }}</span>
            </div>
            <span class="muted small">{{ timeLabel(s.time) }} · <VenueLine :venue-id="s.venue" :screen="s.screen" />{{ s.tag === 'Industry' ? ' · Industry' : '' }}</span>
            <div class="queue-stats">
              <span><strong>{{ queue.inLine }}</strong> in line</span>
              <span><strong>{{ queue.seatsLeft }}</strong> seats left</span>
              <span class="queue-updated">{{ minutesAgo(t, queue.updatedAt) }}</span>
            </div>
          </NuxtLink>
        </div>
      </template>
    </section>

    <section class="section">
      <span v-if="isSampleQueues() || (online && queueFeed.live)" class="live-tag"><span class="pulse" aria-hidden="true" /> LIVE</span>
      <h2 class="live-title">Recent updates</h2>
      <p class="muted small">Latest counts first</p>
      <p v-if="updates.length === 0" class="empty">No counts posted yet.</p>
      <div v-else class="updates">
        <div v-for="{ screening: s, queue, title, venueName, label } in updates" :key="`${s.id}-${queue.updatedAt}`" class="update-row">
          <span class="update-when">{{ minutesAgo(t, queue.updatedAt) }}</span>
          <span class="update-body">
            <span class="update-title">{{ title }}</span>
            <span class="muted small">{{ venueName }} · {{ queue.inLine }} in line · {{ queue.seatsLeft }} seats left</span>
          </span>
          <span class="update-label" :class="`tone-${label.tone}`">{{ label.text }}</span>
        </div>
      </div>
    </section>

    <p v-if="!online && !isSampleQueues()" class="footnote">
      You’re offline. These are the last counts this phone received; they’ll update by themselves when you’re back online.
    </p>
    <p class="footnote">{{ isSampleQueues() ? 'Sample counts for testing.' : queueFeed.live ? 'Counts update live as volunteers count.' : 'Counts update live as volunteers count, during screening hours.' }} Times are samples until the festival schedule is published.</p>
  </div>
</template>
