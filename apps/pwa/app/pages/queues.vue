<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { InfoIcon } from 'lucide-vue-next'
import { FESTIVAL, filmById, venueById } from '@afriff/core/data/programme'
import { dayLabel, queueBar, queueLabel, screeningStart, time12, timeLabel } from '@afriff/core/utils/format'
import { lagosDate } from '@afriff/core/utils/now'
import type { Screening } from '@afriff/core/types/festival'
import {
  QUEUE_OPENS_MINUTES, countedAgo, isSampleQueues, lineOpensAt, lineOpensBefore, nextScreening, queueFeed,
  startingSoon, startsIn, useLiveClock, type QueueRow,
} from '~/lib/queues'
import { openProgrammeDay } from '~/lib/programmeMemory'
import { useFestival } from '~/lib/store'

// QUEUES: screenings starting soon with their live line count and chance of a
// seat (your own plan is on My Festival, in the bottom bar). When nothing
// starts soon: no lines open, the next line to open, and how counting works.
// Updates by itself.
useHead({ title: 'Queues' })
const t = useLiveClock()
const online = useOnline()
const { isScheduled, toggleScheduled, markQueuesChecked } = useFestival()

const howOpen = ref(false)

const shortVenue = (s: Screening) => (venueById(s.venue)?.name ?? '').replace('Filmhouse ', '')
const withInfo = ({ screening: s, queue }: QueueRow) => ({
  s,
  queue,
  title: filmById(s.film)?.title ?? '',
  at: time12(s.time),
  startsIn: startsIn(t.value, s),
  label: queueLabel(queue),
  bar: queue ? queueBar(queue, s.capacity) : null,
  note: screeningStart(s).getTime() - QUEUE_OPENS_MINUTES * 60000 > t.value
    ? `Line opens at ${timeLabel(lineOpensAt(s))}. We will show the count then.`
    : 'We will show the count as soon as the door team starts counting.',
})

const soon = computed(() => startingSoon(t.value))
const rows = computed(() => soon.value.map(withInfo))
const linesOpen = computed(() => soon.value.length > 0)

const counted = computed(() => soon.value.filter((r) => r.queue).map((r) => r.screening.id).join(','))
watch(counted, (ids) => { if (ids) markQueuesChecked(ids.split(',')) }, { immediate: true })

// "Next line to open" when nothing starts soon (gone after the festival)
const next = computed(() => {
  const s = nextScreening(t.value)
  if (!s) return null
  const day = s.date === lagosDate(new Date(t.value)) ? 'Today' : dayLabel(s.date)
  return { s, title: filmById(s.film)?.title ?? '', opens: time12(lineOpensAt(s)), day }
})

const today = computed(() => lagosDate(new Date(t.value)))
const festivalOn = computed(() => FESTIVAL.days.includes(today.value))
const seeProgramme = () => { if (festivalOn.value) openProgrammeDay(today.value) }

const feed = computed(() => {
  if (isSampleQueues()) return { live: true, text: 'Sample counts for testing' }
  if (!online.value) return { live: false, text: 'Offline · the last counts this phone received' }
  if (queueFeed.live) return { live: true, text: 'Live · counted at the door by the AFRIFF team' }
  return { live: false, text: 'Counted at the door by the AFRIFF team' }
})
</script>

<template>
  <div class="page q-page">
    <header class="q-head">
      <PageTitle title="Queues" />
      <p class="q-intro">Check how long the line is before you head to a screening, and how likely you are to get a seat.</p>
      <span v-if="linesOpen" class="q-feed"><i class="q-feed-dot" :class="{ live: feed.live }" />{{ feed.text }}</span>
    </header>

    <template v-if="linesOpen">
      <div class="q-legend" aria-label="What the colours mean">
        <span><i class="q-dot tone-bg-good" />Good chance of a seat</span>
        <span><i class="q-dot tone-bg-warn" />Filling up</span>
        <span><i class="q-dot tone-bg-alert" />Likely full</span>
      </div>

      <div class="q-rows">
        <NuxtLink v-for="r in rows" :key="r.s.id" :to="`/film/${r.s.film}`" class="q-row">
          <span class="q-when">
            <span class="q-time">{{ r.at.time }}</span>
            <span class="q-ampm">{{ r.at.ampm }}</span>
            <span class="q-in">{{ r.startsIn }}</span>
          </span>
          <span class="q-body">
            <span class="q-film">{{ r.title }}</span>
            <span class="q-venue">
              <VenueDot :venue-id="r.s.venue" /> {{ shortVenue(r.s) }}{{ r.s.screen ? ` · ${r.s.screen}` : '' }}{{ r.s.tag === 'Industry' ? ' · Industry' : '' }}
              <StatusTag :status="r.s.status" />
            </span>
            <template v-if="r.queue && r.label && r.bar">
              <span class="q-status" :class="`tone-${r.label.tone}`"><i class="q-dot" :class="`tone-bg-${r.label.tone}`" />{{ r.label.text }}{{ r.label.detail ? ` · ${r.label.detail}` : '' }}</span>
              <!-- seats taken (solid), then the line that would still fit (faded) -->
              <span class="q-bar" aria-hidden="true">
                <span :class="`tone-bg-${r.label.tone}`" :style="{ width: `${r.bar.taken}%` }" />
                <span class="q-bar-line" :class="`tone-bg-${r.label.tone}`" :style="{ width: `${r.bar.line}%` }" />
              </span>
              <span class="q-counts">
                <span><strong>{{ r.queue.inLine }}</strong> in line · {{ r.queue.seatsLeft }} of {{ r.bar.total }} seat{{ r.bar.total === 1 ? '' : 's' }} left</span>
                <span>Counted {{ countedAgo(t, r.queue.updatedAt) }}</span>
              </span>
            </template>
            <template v-else>
              <span class="q-status tone-muted"><i class="q-dot tone-bg-muted" />Line not open yet</span>
              <span class="q-note">{{ r.note }}</span>
            </template>
          </span>
        </NuxtLink>
      </div>

      <button type="button" class="q-how-link" @click="howOpen = true">
        <InfoIcon :size="18" :stroke-width="2" /> How are lines counted?
      </button>
      <BottomSheet v-model:open="howOpen" title="How lines are counted">
        <QueueHowItWorks />
      </BottomSheet>
    </template>

    <template v-else>
      <section class="q-none">
        <svg class="q-none-icon" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="5" cy="7" r="2" /><circle cx="12" cy="7" r="2" /><circle cx="19" cy="7" r="2" />
          <path d="M2 18v-2a3 3 0 0 1 6 0v2M9 18v-2a3 3 0 0 1 6 0v2M16 18v-2a3 3 0 0 1 6 0v2" />
        </svg>
        <h2 class="q-none-title">No lines are open right now</h2>
        <p class="q-intro">
          Each line opens about <strong>{{ lineOpensBefore }}</strong> before its screening. Once it does, the door
          team starts counting and you'll see the numbers here.
        </p>
      </section>

      <section v-if="next" class="q-next">
        <span class="q-eyebrow">NEXT LINE TO OPEN</span>
        <div class="q-next-row">
          <NuxtLink :to="`/film/${next.s.film}`" class="q-next-link">
            <span class="q-when">
              <span class="q-time">{{ next.opens.time }}</span>
              <span class="q-ampm">{{ next.opens.ampm }}</span>
              <span class="q-in">{{ next.day }}</span>
            </span>
            <span class="q-body">
              <span class="q-film">{{ next.title }}</span>
              <span class="q-venue"><VenueDot :venue-id="next.s.venue" /> {{ shortVenue(next.s) }} · film starts {{ timeLabel(next.s.time) }}</span>
            </span>
          </NuxtLink>
          <button
            type="button"
            class="q-save"
            :class="{ on: isScheduled(next.s.id) }"
            :aria-pressed="isScheduled(next.s.id)"
            :aria-label="isScheduled(next.s.id) ? `Remove ${next.title} from My Festival` : `Add ${next.title} to My Festival`"
            @click="toggleScheduled(next.s.id)"
          >
            {{ isScheduled(next.s.id) ? '✓ Scheduled' : '+ Schedule' }}
          </button>
        </div>
      </section>

      <section class="q-how-section">
        <h2 class="q-h2">How it works</h2>
        <QueueHowItWorks />
      </section>

      <NuxtLink to="/programme" class="btn btn-gold q-cta" @click="seeProgramme">
        {{ festivalOn ? "See today's programme" : 'See the programme' }}
      </NuxtLink>
    </template>
  </div>
</template>
