<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ChartColumnIcon, DownloadIcon, RefreshCwIcon } from 'lucide-vue-next'
import { FESTIVAL } from '@afriff/core/data/programme'
import { dayLabel, timeLabel } from '@afriff/core/utils/format'
import { lagosDate } from '@afriff/core/utils/now'
import { SELL_OUT_SHARE, csvDownload, loadReport, type Report } from '~/lib/reports'
import { errMsg } from '~/lib/util'

// Admins: anonymous counts from attendees' phones (only phones with sharing on).
const state = reactive({ busy: false, report: null as Report | null, error: '' })
const day = ref('all')
const today = lagosDate()

async function run() {
  Object.assign(state, { busy: true, error: '' })
  try {
    Object.assign(state, { busy: false, report: await loadReport() })
  } catch (e) {
    Object.assign(state, { busy: false, error: errMsg(e) })
  }
}

const r = computed(() => state.report)
const plannedShown = computed(() => (r.value ? r.value.plannedRows.filter((p) => day.value === 'all' || p.date === day.value).slice(0, 25) : []))
const topRated = computed(() => (r.value ? r.value.ratingRows.filter((x) => x.rated >= 3).sort((a, b) => b.average - a.average || b.rated - a.rated).slice(0, 15) : []))
const mostSeen = computed(() => (r.value ? [...r.value.ratingRows].sort((a, b) => b.seen - a.seen).slice(0, 15) : []))
const maxDay = computed(() => {
  const rep = r.value
  return rep ? Math.max(1, ...FESTIVAL.days.map((d) => rep.activeByDay[d] || 0)) : 1
})

const downloadPlanned = () => csvDownload('afriff-most-planned.csv', [
  ['Type', 'Title', 'Day', 'Time', 'Where', 'Phones planning', 'Seats'],
  ...(r.value?.plannedRows ?? []).map((p) => [p.kind, p.title, p.date, p.time, p.where, p.count, p.capacity || '']),
])
const downloadRatings = () => csvDownload('afriff-ratings.csv', [
  ['Film', 'Director', 'Marked seen', 'Star ratings', 'Average stars'],
  ...[...(r.value?.ratingRows ?? [])].sort((a, b) => b.seen - a.seen).map((x) => [x.title, x.director, x.seen, x.rated, x.rated ? x.average.toFixed(2) : '']),
])
const downloadUsage = () => csvDownload('afriff-app-usage.csv', [
  ['Day', 'Phones that opened the app'],
  ...Object.entries(r.value?.activeByDay ?? {}).sort().map(([d, n]) => [d, n]),
])
</script>

<template>
  <div>
    <h1 class="font-display text-h1 font-semibold">Reports</h1>
    <p class="mt-1 text-muted">
      Anonymous counts from attendees' phones that have sharing switched on (it's on unless they turn it off in My Festival).
      No names or contact details. Real numbers are higher, because not every phone shares.
    </p>
    <UiButton size="sm" class="mt-4" :disabled="state.busy" @click="run"><RefreshCwIcon /> {{ state.busy ? 'Loading…' : r ? 'Refresh reports' : 'Load reports' }}</UiButton>
    <p class="mt-2 text-meta text-muted">Each load reads one record per phone, so load when you need it rather than leaving it open all day.</p>
    <p v-if="state.error" class="mt-2 text-meta text-danger">Couldn't load: {{ state.error }}</p>

    <template v-if="r">
      <p v-if="!r.published" class="mt-3 rounded-tile bg-raised px-3 py-2 text-meta text-muted">Nothing has been published yet, so names may be missing. Press Publish to app first.</p>
      <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div v-for="tile in [[r.phones, 'phones sharing'], [r.activeByDay[today] || 0, 'active today'], [r.totalPlans, 'plans made'], [r.totalRatings, 'star ratings']]" :key="tile[1]" class="card flex flex-col p-3">
          <span class="font-display text-h1 font-semibold tabular-nums">{{ tile[0] }}</span>
          <span class="text-label text-muted">{{ tile[1] }}</span>
        </div>
      </div>

      <section class="mt-8">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h2 class="flex items-center gap-2 font-display text-h2 font-semibold"><ChartColumnIcon class="size-5 text-muted" /> Most planned</h2>
          <UiButton size="sm" variant="secondary" @click="downloadPlanned"><DownloadIcon /> Spreadsheet</UiButton>
        </div>
        <select v-model="day" class="field-input w-auto!" aria-label="Day">
          <option value="all">All days</option>
          <option v-for="d in FESTIVAL.days" :key="d" :value="d">{{ dayLabel(d) }}</option>
        </select>
        <p v-if="plannedShown.length === 0" class="mt-3 text-muted">No plans yet{{ day !== 'all' ? ' for this day' : '' }}.</p>
        <ol class="mt-2 divide-y divide-line">
          <li v-for="p in plannedShown" :key="p.id" class="flex items-start gap-3 py-2.5">
            <span class="w-10 shrink-0 font-display text-h3 font-semibold tabular-nums">{{ p.count }}</span>
            <span class="flex min-w-0 flex-col">
              <span class="flex flex-wrap items-center gap-1.5 font-semibold">{{ p.title }}<UiBadge v-if="p.capacity && p.count >= p.capacity * SELL_OUT_SHARE" tone="danger">May sell out</UiBadge></span>
              <span class="text-meta text-muted">{{ p.kind }} · {{ p.date ? dayLabel(p.date) : '' }} {{ p.time ? timeLabel(p.time) : '' }} · {{ p.where }}{{ p.capacity ? ` · ${p.capacity} seats` : '' }}</span>
            </span>
          </li>
        </ol>
      </section>

      <section class="mt-8">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h2 class="font-display text-h2 font-semibold">Ratings</h2>
          <UiButton size="sm" variant="secondary" @click="downloadRatings"><DownloadIcon /> Spreadsheet</UiButton>
        </div>
        <h3 class="mt-3 text-h3 font-semibold">Highest rated <span class="text-meta font-normal text-muted">(films with at least 3 ratings)</span></h3>
        <p v-if="topRated.length === 0" class="mt-1 text-muted">Not enough ratings yet.</p>
        <ol class="divide-y divide-line">
          <li v-for="x in topRated" :key="x.id" class="flex items-start gap-3 py-2.5">
            <span class="w-12 shrink-0 font-display text-h3 font-semibold tabular-nums">{{ x.average.toFixed(1) }}★</span>
            <span class="flex flex-col"><span class="font-semibold">{{ x.title }}</span><span class="text-meta text-muted">{{ x.rated }} ratings · {{ x.seen }} marked seen</span></span>
          </li>
        </ol>
        <h3 class="mt-5 text-h3 font-semibold">Most seen</h3>
        <p v-if="mostSeen.length === 0" class="mt-1 text-muted">Nobody has marked a film seen yet.</p>
        <ol class="divide-y divide-line">
          <li v-for="x in mostSeen" :key="x.id" class="flex items-start gap-3 py-2.5">
            <span class="w-12 shrink-0 font-display text-h3 font-semibold tabular-nums">{{ x.seen }}</span>
            <span class="flex flex-col"><span class="font-semibold">{{ x.title }}</span><span class="text-meta text-muted">{{ x.director }}{{ x.rated ? ` · ${x.average.toFixed(1)}★ from ${x.rated}` : '' }}</span></span>
          </li>
        </ol>
      </section>

      <section class="mt-8">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h2 class="font-display text-h2 font-semibold">App usage</h2>
          <UiButton size="sm" variant="secondary" @click="downloadUsage"><DownloadIcon /> Spreadsheet</UiButton>
        </div>
        <p class="text-meta text-muted">Phones that opened the app each festival day.</p>
        <div class="mt-3 flex flex-col gap-2">
          <div v-for="d in FESTIVAL.days" :key="d" class="flex items-center gap-3 text-meta">
            <span class="w-24 shrink-0 text-muted">{{ dayLabel(d) }}</span>
            <span class="h-2.5 flex-1 overflow-hidden rounded-full bg-raised"><span class="block h-full rounded-full bg-accent" :style="{ width: `${((r.activeByDay[d] || 0) / maxDay) * 100}%` }" /></span>
            <span class="w-8 text-right tabular-nums">{{ r.activeByDay[d] || 0 }}</span>
          </div>
        </div>
      </section>
      <p class="mt-6 text-meta text-muted">Loaded {{ r.loadedAt.toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit' }) }}.</p>
    </template>
  </div>
</template>
