<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { increment, serverTimestamp, setDoc, type FieldValue, type Timestamp } from 'firebase/firestore'
import { CheckIcon, ChevronLeftIcon, MinusIcon, PlusIcon, Undo2Icon } from 'lucide-vue-next'
import { queueLabel, timeLabel } from '@afriff/core/utils/format'
import { boardRef, useBoard } from '~/lib/board'
import type { BoardEntry, DoorScreening, Profile } from '~/lib/types'
import type { Tone } from '@afriff/core/types/festival'
import type { BadgeTone } from '@afriff/theme/components/ui/UiBadge.vue'
import { errMsg } from '~/lib/util'

// THE COUNTER for one screening, in the door view (/door).
// Two big buttons:
//   + Joined the queue  → people in line +1
//   ✓ Let in            → people in line −1 AND seats left −1, together
// so the seat count goes down by itself as people walk in.
//
// Counts live in ONE record per venue per day: queueDays/{date}/venues/{venue}
// with a map `s` of screeningId → { inLine, seatsLeft, seatsStart, updatedAt,
// byName }. Phones read those records directly with a live listener (lib/queues.ts).
//
// Taps show at once and are sent in small bundles (~1 second of tapping per
// save) as "add N" / "take N away", never a fixed number, so two volunteers
// at the same door never overwrite each other and the free database plan's
// write limit isn't eaten up. Taps made without signal are sent on reconnect.
const props = withDefaults(defineProps<{ screening: DoorScreening; filmTitle?: string; venueName?: string; profile: Profile }>(), { filmTitle: '', venueName: '' })
const emit = defineEmits<{ back: [] }>()

interface Tap { inLine?: number; seatsLeft?: number }

const SEND_AFTER_MS = 1000 // quiet time after the last tap before sending
const SEND_AT_MOST_MS = 2500 // keep tapping and it still sends this often

const clamp = (n: number | undefined, max = Infinity) => Math.min(max, Math.max(0, n || 0))
const buzz = () => navigator.vibrate?.(12)
const ago = (ts: Timestamp | undefined) => {
  if (!ts?.seconds) return ''
  const m = Math.round((Date.now() - ts.seconds * 1000) / 60000)
  return m <= 0 ? 'just now' : `${m} min ago`
}

const board = useBoard(() => props.screening.date, () => props.screening.venue)
const entry = computed<BoardEntry | null>(() => board.data?.s?.[props.screening.id] || null)
const error = ref('')
const fixing = ref(false)
const seatsAtDoor = ref(String(props.screening.capacity || ''))

// taps not sent yet, and this phone's taps so far (for Undo)
const unsent = reactive({ inLine: 0, seatsLeft: 0 })
const history = ref<Tap[]>([])
const timers: { quiet: ReturnType<typeof setTimeout> | undefined; first: ReturnType<typeof setTimeout> | undefined } = { quiet: undefined, first: undefined }
const byName = props.profile.name || props.profile.email || ''

const write = (fields: Record<string, number | FieldValue>) =>
  setDoc(
    boardRef(props.screening.date, props.screening.venue),
    {
      date: props.screening.date,
      venue: props.screening.venue,
      updatedAt: serverTimestamp(),
      s: { [props.screening.id]: { ...fields, updatedAt: serverTimestamp(), byName } },
    },
    { merge: true },
  ).catch((e: unknown) => { error.value = errMsg(e) })

function send() {
  clearTimeout(timers.quiet)
  clearTimeout(timers.first)
  timers.quiet = undefined
  timers.first = undefined
  const { inLine, seatsLeft } = unsent
  if (!inLine && !seatsLeft) return
  unsent.inLine = 0
  unsent.seatsLeft = 0
  const fields: Record<string, FieldValue> = {}
  if (inLine) fields.inLine = increment(inLine)
  if (seatsLeft) fields.seatsLeft = increment(seatsLeft)
  write(fields)
}

// Keep the screen on while counting (phones that support it)
let lock: WakeLockSentinel | null = null
async function stayAwake() {
  try {
    if (document.visibilityState === 'visible' && navigator.wakeLock) lock = await navigator.wakeLock.request('screen')
  } catch {
    /* not allowed or not supported: the screen just dims as usual */
  }
}
// send anything left when hiding the app; ask for the wake lock again on return
const onVisibility = () => {
  if (document.visibilityState === 'hidden') send()
  else stayAwake()
}
onMounted(() => {
  stayAwake()
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  lock?.release().catch(() => {})
  send()
})

const seatsStart = computed(() => entry.value?.seatsStart || props.screening.capacity || Infinity)
// the numbers right now: saved counts + taps not sent yet (always read fresh,
// so quick double-taps see each other)
const inLine = computed(() => clamp((entry.value?.inLine ?? 0) + unsent.inLine))
const seatsLeft = computed(() => clamp((entry.value?.seatsLeft ?? 0) + unsent.seatsLeft, seatsStart.value))

// apply a change now, send it shortly
function apply(d: Tap, remember = true) {
  if (!d.inLine && !d.seatsLeft) return
  unsent.inLine += d.inLine || 0
  unsent.seatsLeft += d.seatsLeft || 0
  if (remember) history.value.push(d)
  buzz()
  clearTimeout(timers.quiet)
  timers.quiet = setTimeout(send, SEND_AFTER_MS)
  if (!timers.first) timers.first = setTimeout(send, SEND_AT_MOST_MS)
}

const joined = () => apply({ inLine: 1 })
function letIn(n: number) {
  const seats = Math.min(n, seatsLeft.value)
  if (!seats) return
  apply({ inLine: -Math.min(seats, inLine.value), seatsLeft: -seats }) // walk-ins with no queue just use a seat
}
function undo() {
  const last = history.value.pop()
  if (last) apply({ inLine: -(last.inLine || 0), seatsLeft: -(last.seatsLeft || 0) }, false)
}
function start() {
  const seats = Math.max(0, parseInt(seatsAtDoor.value, 10) || 0)
  write({ inLine: 0, seatsLeft: seats, seatsStart: seats })
  buzz()
}
function markFull() {
  send()
  write({ seatsLeft: 0 })
  history.value = []
  buzz()
}

const label = computed(() => (entry.value ? queueLabel({ inLine: inLine.value, seatsLeft: seatsLeft.value }) : null))
const waiting = computed(() => board.pending || unsent.inLine !== 0 || unsent.seatsLeft !== 0)
const full = computed(() => Boolean(entry.value) && seatsLeft.value === 0)
const LABEL_TONE: Record<Tone, BadgeTone> = { muted: 'neutral', good: 'success', gold: 'accent', alert: 'danger' }
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-3 border-b border-line pb-2.5">
      <button type="button" class="pressable -ml-2 inline-flex h-10 items-center gap-1 rounded-full pr-3 pl-1.5 text-body font-medium text-muted hover:bg-hover hover:text-ink" @click="send(); emit('back')">
        <ChevronLeftIcon class="size-5" /> Today
      </button>
      <span v-if="entry" class="inline-flex items-center gap-1.5 text-meta text-muted">
        <span class="size-2 rounded-full" :class="waiting ? 'pulse text-accent' : 'bg-success'" aria-hidden="true" />
        {{ waiting ? 'Saving…' : `Saved ${ago(entry.updatedAt)}` }}
      </span>
    </div>

    <div class="flex items-start justify-between gap-3">
      <h1 class="font-display text-h1 font-semibold">{{ filmTitle || screening.film }}</h1>
      <UiBadge v-if="label" :tone="LABEL_TONE[label.tone]" class="mt-1.5 px-2! py-0.5! text-meta! font-semibold!">{{ label.text }}</UiBadge>
    </div>
    <p class="-mt-2 text-muted tabular-nums">{{ timeLabel(screening.time) }} · {{ venueName }} · {{ screening.screen }}</p>

    <p v-if="!board.loaded" class="text-muted">Loading…</p>
    <p v-if="error || board.error" class="text-meta text-danger">Couldn't save: {{ error || board.error }}</p>

    <!-- Not counted yet: how many seats are free at the door? -->
    <div v-if="board.loaded && !entry" class="card flex flex-col gap-3 p-4">
      <label for="seats-at-door" class="eyebrow text-muted">Seats available at the door</label>
      <div class="flex items-center gap-3">
        <input
          id="seats-at-door"
          v-model="seatsAtDoor"
          class="field-input h-16! w-28! shrink-0 border-accent/60! text-center font-display text-[2rem]! font-semibold tabular-nums"
          type="number"
          inputmode="numeric"
          min="0"
        />
        <span class="text-meta text-muted">From the console ({{ screening.capacity }} seats). Change it if some seats are reserved or sold in advance.</span>
      </div>
      <UiButton size="lg" block class="h-16! text-h3!" @click="start">Start counting</UiButton>
      <p class="text-meta text-muted">Attendees see this queue as soon as you start.</p>
    </div>

    <template v-if="entry">
      <div class="grid grid-cols-2 gap-2.5">
        <div class="card flex flex-col gap-1 p-4">
          <span class="eyebrow text-muted">In line</span>
          <span class="font-display text-[3.25rem] leading-none font-semibold tabular-nums">{{ inLine }}</span>
        </div>
        <div class="card flex flex-col gap-1 p-4" :class="full && 'border-danger/60'">
          <span class="eyebrow text-muted">Seats left</span>
          <span class="font-display text-[3.25rem] leading-none font-semibold tabular-nums" :class="full && 'text-danger'">{{ seatsLeft }}</span>
          <span class="text-meta text-muted">of {{ Number.isFinite(seatsStart) ? seatsStart : '?' }}</span>
        </div>
      </div>

      <p v-if="full" role="status" class="rounded-tile border border-danger/40 bg-danger-soft px-3.5 py-3 text-body">
        The cinema is full. Attendees now see <strong class="font-semibold text-danger">Full</strong>.{{ inLine > 0 ? ` Let the ${inLine} ${inLine === 1 ? 'person' : 'people'} still in line know.` : '' }}
      </p>

      <!-- The two big buttons -->
      <button
        type="button"
        class="pressable flex h-16 w-full items-center justify-center gap-2 rounded-card border border-line bg-raised text-h3 font-semibold text-ink active:scale-[0.97]"
        @click="joined"
      >
        <PlusIcon class="size-[1.375rem]" :stroke-width="2.5" /> Joined the queue
      </button>
      <button
        type="button"
        class="pressable flex h-[5.5rem] w-full items-center justify-center gap-2 rounded-card bg-accent font-display text-[1.375rem] font-semibold text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_1px_2px_rgb(2_4_20/0.22)] active:scale-[0.97] disabled:opacity-40"
        :disabled="full"
        @click="letIn(1)"
      >
        <CheckIcon class="size-6" :stroke-width="2.75" /> {{ full ? 'Let in (no seats left)' : 'Let in' }}
      </button>
      <div class="grid grid-cols-3 gap-2">
        <UiButton variant="secondary" size="lg" class="px-2!" :disabled="full" @click="letIn(5)">Let in 5</UiButton>
        <UiButton variant="secondary" size="lg" class="px-2!" :disabled="!history.length" @click="undo"><Undo2Icon /> Undo</UiButton>
        <UiButton
          variant="secondary"
          size="lg"
          class="px-2!"
          :class="fixing && 'border-accent/60! text-accent-ink!'"
          :aria-pressed="fixing"
          @click="fixing = !fixing"
        >Fix numbers</UiButton>
      </div>

      <!-- Corrections -->
      <div v-if="fixing" class="card flex flex-col gap-2.5 p-4">
        <p class="text-meta text-muted">For corrections, e.g. someone left the line without going in.</p>
        <div v-for="row in [
          { label: 'In line', field: 'inLine', minus: inLine === 0, plus: false, less: 'One fewer in line', more: 'One more in line' },
          { label: 'Seats left', field: 'seatsLeft', minus: seatsLeft === 0, plus: seatsLeft >= seatsStart, less: 'One fewer seat', more: 'One more seat' },
        ]" :key="row.field" class="grid grid-cols-[1fr_4rem_4rem] items-center gap-2 font-semibold">
          <span>{{ row.label }}</span>
          <button type="button" class="pressable grid h-12 place-items-center rounded-tile border border-line bg-raised disabled:opacity-35" :disabled="row.minus" :aria-label="row.less" @click="apply({ [row.field]: -1 })">
            <MinusIcon class="size-5" :stroke-width="2.5" />
          </button>
          <button type="button" class="pressable grid h-12 place-items-center rounded-tile border border-line bg-raised disabled:opacity-35" :disabled="row.plus" :aria-label="row.more" @click="apply({ [row.field]: 1 })">
            <PlusIcon class="size-5" :stroke-width="2.5" />
          </button>
        </div>
        <UiButton variant="danger" :disabled="full" @click="markFull">Mark as full (0 seats)</UiButton>
      </div>

      <p class="text-center text-meta text-muted">Attendees see new counts within about a minute.{{ entry.byName ? ` Last saved by ${entry.byName}.` : '' }}</p>
    </template>
  </div>
</template>
