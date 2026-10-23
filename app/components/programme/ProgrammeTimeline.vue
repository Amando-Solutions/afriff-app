<script setup lang="ts">
import type { DayItem } from '~/lib/dayItems'
import { computed, onMounted, useTemplateRef, watch } from 'vue'
import { CheckIcon } from 'lucide-vue-next'
import { VENUES } from '~/data/programme'
import { EVENT_TYPES } from '~/data/events'
import { fromMinutes, timeLabel } from '~/lib/format'
import { lagosDate, lagosMinutes } from '~/lib/now'
import { useFestival } from '~/lib/store'

// Timeline: venues and screens down the left, hours across, a block per
// showing, a red line for "now". Scrolls sideways.
const props = defineProps<{ items: DayItem[]; day: string }>()
const { isScheduled } = useFestival()
const PX = 120 // pixels per hour
const LABEL = 92 // width of the room-name column
const scroller = useTemplateRef<HTMLElement>('scroller')

const grid = computed(() => {
  const items = props.items
  const nowMin = lagosDate() === props.day ? lagosMinutes() : null
  let from = Math.floor(Math.min(...items.map((i) => i.start)) / 60) * 60
  let to = Math.ceil(Math.max(...items.map((i) => i.end)) / 60) * 60
  if (nowMin !== null) {
    from = Math.min(from, Math.floor(nowMin / 60) * 60)
    to = Math.max(to, Math.ceil((nowMin + 1) / 60) * 60)
  }
  const hours = []
  for (let m = from; m < to; m += 60) hours.push(m)
  const x = (mins: number) => ((mins - from) / 60) * PX
  // one group per cinema, plus "Other places" for events away from the cinemas
  const places = [...VENUES.map((v) => ({ id: v.id, name: v.name, color: v.color })), { id: null, name: 'Other places', color: '#D9A441' }]
  const groups = places
    .map((p) => {
      const here = items.filter((i) => (i.venue || null) === p.id)
      return { place: p, here, lanes: [...new Set(here.map((i) => i.lane))].sort() }
    })
    .filter((g) => g.here.length)
  return { nowMin, hours, x, trackWidth: ((to - from) / 60) * PX, groups }
})

const hourLabel = (m: number) => timeLabel(fromMinutes(m % (24 * 60))).replace(':00', '').toLowerCase()
const endLabel = (i: DayItem) => timeLabel(fromMinutes(i.end % (24 * 60)))

function scrollToNow() {
  const g = grid.value
  if (scroller.value) scroller.value.scrollLeft = g.nowMin !== null ? Math.max(0, g.x(g.nowMin) - 120) : 0
}
onMounted(scrollToNow)
watch(() => props.day, scrollToNow, { flush: 'post' })
</script>

<template>
  <div ref="scroller" class="-mx-4 overflow-x-auto pt-3.5 pb-1.5">
    <div class="relative" :style="{ width: `${LABEL + grid.trackWidth + 16}px`, '--px': `${PX}px` }">
      <div class="relative h-6 border-b border-line" :style="{ marginLeft: `${LABEL}px` }">
        <span
          v-for="m in grid.hours"
          :key="m"
          class="absolute top-0 h-6 border-l border-line-strong pl-1.5 text-label whitespace-nowrap text-muted"
          :style="{ left: `${grid.x(m)}px` }"
        >{{ hourLabel(m) }}</span>
      </div>
      <div v-for="g in grid.groups" :key="g.place.id || 'other'" class="mt-3.5">
        <div class="sticky left-0 inline-block px-4 pb-1.5 eyebrow" :style="{ color: g.place.color }">{{ g.place.name }}</div>
        <div v-for="lane in g.lanes" :key="lane" class="flex h-[4.375rem]">
          <div
            class="sticky left-0 z-2 flex shrink-0 items-center border-l-[3px] bg-canvas pl-3 text-meta text-ink"
            :style="{ width: `${LABEL}px`, borderLeftColor: g.place.color }"
          >{{ lane }}</div>
          <div class="tl-track relative shrink-0" :style="{ width: `${grid.trackWidth}px` }">
            <NuxtLink
              v-for="i in g.here.filter((it) => it.lane === lane)"
              :key="i.id"
              :to="i.href"
              class="absolute top-1.5 bottom-1.5 flex flex-col gap-0.5 overflow-hidden rounded-thumb border px-2 py-1.5"
              :class="[i.kind === 'event' && 'border-dashed', i.status === 'cancelled' && 'opacity-45', isScheduled(i.id) && 'shadow-[inset_0_0_0_1.5px_var(--c-accent)]']"
              :style="{
                left: `${grid.x(i.start)}px`,
                width: `${Math.max(64, grid.x(i.end) - grid.x(i.start) - 4)}px`,
                background: `${g.place.color}24`,
                borderColor: `${g.place.color}66`,
              }"
            >
              <span class="flex items-center gap-1 truncate text-meta font-semibold">
                <CheckIcon v-if="isScheduled(i.id)" class="size-3.5 shrink-0 text-accent-ink" :stroke-width="3" />{{ i.title }}
              </span>
              <span class="truncate text-micro text-muted">{{ i.kind === 'event' ? `${EVENT_TYPES[i.event.type].label} · ` : '' }}{{ timeLabel(i.time) }} – {{ endLabel(i) }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>
      <div
        v-if="grid.nowMin !== null"
        class="pointer-events-none absolute top-0 bottom-0 z-3 w-0.5 bg-danger before:absolute before:-top-1 before:-left-1 before:size-2.5 before:rounded-full before:bg-danger before:content-['']"
        :style="{ left: `${LABEL + grid.x(grid.nowMin)}px` }"
        aria-label="Now"
      />
    </div>
  </div>
</template>
