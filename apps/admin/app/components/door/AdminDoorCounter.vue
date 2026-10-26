<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { signOut } from 'firebase/auth'
import { deleteDoc } from 'firebase/firestore'
import { LogOutIcon } from 'lucide-vue-next'
import { FESTIVAL } from '@afriff/core/data/programme'
import { dayLabel, screeningStart, timeLabel } from '@afriff/core/utils/format'
import { lagosDate, now } from '@afriff/core/utils/now'
import { auth } from '~/lib/firebase'
import { useCollection } from '~/lib/data'
import { boardRef, useBoard } from '~/lib/board'
import type { BoardEntry, DoorScreening, Profile } from '~/lib/types'
import { errMsg } from '~/lib/util'

type RowState = 'done' | 'counting' | 'now' | 'later'

// THE DOOR VIEW (/door): what door volunteers use, on their own phone.
// Opens straight to today at their venue and highlights the screening to
// count now. Admins can pick any venue and festival day, and clear test counts.
const props = defineProps<{ profile: Profile; standalone?: boolean }>()

const COUNT_FROM_MINUTES = 120 // "Count now" from 2 hours before the start
const clamp = (n: number | undefined) => Math.max(0, n || 0)

const screenings = useCollection('screenings')
const films = useCollection('films')
const venues = useCollection('venues')
const isAdmin = props.profile.role === 'admin'
const today = lagosDate()
const venue = ref(isAdmin ? '' : props.profile.venue || '')
const day = ref<string>(FESTIVAL.days.includes(today) ? today : FESTIVAL.days[0]!)
const openId = ref<string | null>(null)
const clearing = ref('')

// volunteers only ever see today; admins can look at any festival day
const shownDay = computed(() => (isAdmin ? day.value : today))
const board = useBoard(shownDay, venue)
// a "Counts cleared." note belongs to one venue and day
watch([shownDay, venue], () => { clearing.value = '' })

// the list moves on by itself (Count now → Done) without a reload
const t = ref(now().getTime())
const tick = setInterval(() => { t.value = now().getTime() }, 30000)
onBeforeUnmount(() => clearInterval(tick))

const list = computed(() => ((screenings.state.items || []) as unknown as DoorScreening[])
  .filter((s) => s.date === shownDay.value && (!venue.value || s.venue === venue.value))
  .sort((a, b) => (a.time || '').localeCompare(b.time || '')))
const open = computed(() => list.value.find((s) => s.id === openId.value))
const venueName = (id: string) => String(venues.map.value[id]?.name || id)
const filmTitle = (s: DoorScreening) => String(films.map.value[s.film]?.title || s.film)

// Where each screening stands, for the Today list
function stateOf(s: DoorScreening, entry: BoardEntry | undefined): RowState {
  const start = screeningStart(s).getTime()
  if (start <= t.value) return 'done'
  if (entry) return 'counting'
  if (start - t.value <= COUNT_FROM_MINUTES * 60000) return 'now'
  return 'later'
}
const rows = computed(() => {
  const entries: Record<string, BoardEntry> = venue.value ? board.data?.s || {} : {}
  return list.value.map((s) => ({ s, entry: entries[s.id], state: stateOf(s, entries[s.id]) }))
})
// the one to count now: something already being counted, else the next to start within 2 hours
const focus = computed(() => (venue.value ? rows.value.find((r) => r.state === 'counting') || rows.value.find((r) => r.state === 'now') : null))
const TAG: Record<RowState, string> = { done: 'Done', counting: 'Counting', now: 'Count now', later: 'Next' }

async function clearAll() {
  if (!window.confirm(`Delete every queue count at ${venueName(venue.value)} on ${dayLabel(shownDay.value)}? Use this to remove test counts.`)) return
  clearing.value = 'Clearing…'
  try {
    await deleteDoc(boardRef(shownDay.value, venue.value))
    clearing.value = 'Counts cleared.'
  } catch (e) {
    clearing.value = `Couldn't clear: ${errMsg(e)}`
  }
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-xl flex-col gap-3">
    <!-- Own top bar when opened at /door (no console around it) -->
    <div v-if="standalone" class="pt-safe flex items-center justify-between gap-3 border-b border-line pb-2.5">
      <span class="inline-flex items-center gap-2">
        <AppLogo :show-wordmark="false" :size="26" />
        <span class="font-display text-h3 font-semibold">Door</span>
      </span>
      <span class="flex items-center gap-1">
        <NuxtLink v-if="isAdmin" to="/admin" class="rounded-full px-3 py-2 text-meta font-medium text-muted hover:bg-hover hover:text-ink">Console</NuxtLink>
        <button type="button" class="pressable grid size-9 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink" aria-label="Log out" @click="signOut(auth)">
          <LogOutIcon class="size-[1.125rem]" />
        </button>
      </span>
    </div>

    <template v-if="!isAdmin && !profile.venue">
      <h1 class="font-display text-h1 font-semibold">Door</h1>
      <p class="rounded-tile bg-raised px-3.5 py-2.5 text-meta text-muted">You don't have a venue yet. Ask an admin to set your venue on the Team page.</p>
    </template>

    <AdminDoorScreening
      v-else-if="open"
      :key="open.id"
      :screening="open"
      :film-title="filmTitle(open)"
      :venue-name="venueName(open.venue)"
      :profile="profile"
      @back="openId = null"
    />

    <template v-else>
      <div>
        <h1 class="font-display text-h1 font-semibold">{{ venue ? venueName(venue) : 'Pick a venue' }}</h1>
        <p class="mt-0.5 text-muted">{{ dayLabel(shownDay) }}{{ isAdmin ? '' : ` · ${profile.name || profile.email}` }}</p>
      </div>

      <div v-if="isAdmin" class="flex flex-wrap gap-2">
        <select v-model="venue" class="field-input w-auto!" aria-label="Venue">
          <option value="">Pick a venue</option>
          <option v-for="v in venues.state.items || []" :key="v.id" :value="v.id">{{ v.name }}</option>
        </select>
        <select v-model="day" class="field-input w-auto!" aria-label="Day">
          <option v-for="d in FESTIVAL.days" :key="d" :value="d">{{ dayLabel(d) }}</option>
        </select>
      </div>

      <p v-if="screenings.state.items == null" class="text-muted">Loading…</p>
      <p v-if="screenings.state.items?.length === 0" class="rounded-tile bg-raised px-3.5 py-2.5 text-meta text-muted">No screenings in the database yet. An admin needs to load the festival data first (Festival data page).</p>
      <p v-if="venue && (screenings.state.items?.length ?? 0) > 0 && list.length === 0" class="text-muted">{{ isAdmin ? 'No screenings at this venue on this day.' : 'No screenings at your venue today.' }}</p>

      <!-- The one to count now -->
      <button v-if="focus" type="button" class="card card-interactive flex w-full flex-col gap-1.5 border-2 border-accent! p-4 text-left" @click="openId = focus.s.id">
        <span class="eyebrow text-accent-ink">
          {{ focus.state === 'counting' ? 'Counting now' : 'Count now' }} · starts {{ timeLabel(focus.s.time) }}
        </span>
        <span class="font-display text-h2 font-semibold">{{ filmTitle(focus.s) }}</span>
        <span class="text-meta text-muted tabular-nums">
          {{ focus.s.screen }} · {{ focus.entry ? `${clamp(focus.entry.inLine)} in line · ${clamp(focus.entry.seatsLeft)} seats left` : `${focus.s.capacity} seats` }}
        </span>
        <span class="mt-1.5 flex h-14 items-center justify-center rounded-card bg-accent text-h3 font-semibold text-on-accent">Open counter</span>
      </button>

      <!-- Everything else today -->
      <div v-if="venue && rows.length" class="flex flex-col">
        <button
          v-for="r in rows.filter((x) => x !== focus)"
          :key="r.s.id"
          type="button"
          class="row-interactive flex w-full items-center gap-3 border-b border-line px-1 py-3.5 text-left"
          :class="r.state === 'done' && 'opacity-50'"
          @click="openId = r.s.id"
        >
          <span class="w-[5.25rem] shrink-0 font-display text-h3 font-semibold whitespace-nowrap tabular-nums">{{ timeLabel(r.s.time) }}</span>
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="truncate font-semibold">{{ filmTitle(r.s) }}</span>
            <span class="text-meta text-muted tabular-nums">
              {{ r.s.screen }}{{ r.entry ? ` · ${r.state === 'done' ? 'Final: ' : ''}${clamp(r.entry.inLine)} in line · ${clamp(r.entry.seatsLeft)} seats left` : '' }}
            </span>
          </span>
          <UiBadge :tone="r.state === 'now' || r.state === 'counting' ? 'accent' : 'neutral'" class="self-center!">{{ TAG[r.state] }}</UiBadge>
        </button>
      </div>

      <div v-if="isAdmin && venue && (board.data || clearing)" class="mt-4 flex flex-col items-start gap-1.5 border-t border-line pt-4">
        <UiButton v-if="board.data" variant="secondary" size="sm" @click="clearAll">Clear counts for this venue and day</UiButton>
        <p v-if="clearing" class="text-meta text-muted">{{ clearing }}</p>
        <p class="text-meta text-muted">Admins only. Use after testing so practice counts never show on the real day.</p>
      </div>
    </template>
  </div>
</template>
