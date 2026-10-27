<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore'
import type { Profile } from '~/lib/types'
import { errMsg, whenLagos } from '~/lib/util'
import { BellRingIcon, SendIcon } from 'lucide-vue-next'
import { db } from '~/lib/firebase'
import { COLLECTIONS, isCollection } from '~/lib/schema'
import { publishToApp } from '~/lib/publish'
import { nextPushes, sendDuePushes } from '~/lib/push'
import { MAX_PUSHES_PER_PUBLISH, type PushOutcome } from '#shared/push'

interface PublishedInfo { version?: number; counts?: Record<string, number>; publishedAt?: Timestamp; publishedByName?: string }
const props = defineProps<{ profile: Profile }>()
// undefined = still loading, null = never published
const current = ref<PublishedInfo | null | undefined>(undefined)
const state = reactive({ busy: false, done: null as Awaited<ReturnType<typeof publishToApp>> | null, error: '' })
// Announcements ticked "Send as a push notification" that this publish will send
const upcoming = ref<Awaited<ReturnType<typeof nextPushes>> | null>(null)
const push = reactive({ busy: false, results: [] as PushOutcome[], error: '' })

const stop = onSnapshot(
  doc(db, 'published', 'current'),
  (snap) => { current.value = snap.exists() ? (snap.data() as PublishedInfo) : null },
  (e) => { state.error = errMsg(e) },
)
onBeforeUnmount(stop)

// null when it can't be worked out (e.g. the database rules aren't updated yet): the server still decides
const loadUpcoming = () => nextPushes().catch(() => null)
onMounted(async () => { upcoming.value = await loadUpcoming() })

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

async function run() {
  const due = await loadUpcoming()
  upcoming.value = due
  const pushNote = due?.send.length ? `\n\nIt also sends ${plural(due.send.length, 'push notification')} to phones with alerts on.` : ''
  if (!window.confirm(`Publish the current festival data to the attendee app? Open phones pick it up within seconds.${pushNote}`)) return
  Object.assign(state, { busy: true, done: null, error: '' })
  Object.assign(push, { busy: false, results: [], error: '' })
  try {
    Object.assign(state, { busy: false, done: await publishToApp(props.profile) })
  } catch (e) {
    Object.assign(state, { busy: false, error: errMsg(e) })
    return
  }
  // Published: now the notifications, from what attendees can see. Skipped when
  // nothing is ticked, so an unset-up server doesn't show an error on every publish.
  if (due && !due.send.length && !due.skip.length) return
  push.busy = true
  try {
    push.results = await sendDuePushes()
  } catch (e) {
    push.error = errMsg(e)
  }
  push.busy = false
  upcoming.value = await loadUpcoming()
}
const when = (ts?: Timestamp) => whenLagos(ts, '')
const countsText = (c?: Record<string, number>) => Object.entries(c || {}).map(([k, n]) => `${n} ${(isCollection(k) ? COLLECTIONS[k].title : k).toLowerCase()}`).join(', ')
</script>

<template>
  <div>
    <h1 class="font-display text-h1 font-semibold">Publish to app</h1>
    <p class="mt-1 text-muted">
      Edits and approved changes are saved in the database straight away, but attendees only see them after an admin publishes.
      Make your edits, check them, then publish. Phones pick it up within about a minute, or the next time the app is opened.
    </p>
    <div class="card mt-4 flex flex-col gap-3 p-4">
      <p v-if="current === undefined" class="text-muted">Checking…</p>
      <p v-if="current === null" class="rounded-tile bg-raised px-3 py-2 text-meta text-muted">Nothing has been published yet. The attendee app is showing its built-in copy.</p>
      <p v-if="current" class="text-meta text-muted">Last published {{ when(current.publishedAt) }} by {{ current.publishedByName }}: {{ countsText(current.counts) }}.</p>

      <!-- what this publish will also send to phones -->
      <div v-if="upcoming && (upcoming.send.length || upcoming.skip.length)" class="flex flex-col gap-1.5 rounded-tile bg-raised px-3 py-2.5 text-meta">
        <p class="flex items-center gap-2 font-semibold"><BellRingIcon class="size-4 text-accent-ink" /> Publishing also sends {{ plural(upcoming.send.length, 'push notification') }}</p>
        <p v-for="n in upcoming.send" :key="n.id" class="text-muted">“{{ n.title }}”</p>
        <p v-if="upcoming.skip.length" class="text-muted">
          Not sent ({{ MAX_PUSHES_PER_PUBLISH }} at most per publish, newest first): {{ upcoming.skip.map((n) => `“${n.title}”`).join(', ') }}
        </p>
        <p class="text-label text-subtle">To phones with alerts on. Untick “Send as a push notification” on a news item to publish it quietly.</p>
      </div>

      <UiButton size="lg" class="self-start" :disabled="state.busy || push.busy" @click="run"><SendIcon /> {{ state.busy ? 'Publishing…' : push.busy ? 'Sending notifications…' : 'Publish to app' }}</UiButton>
      <p v-if="state.done" class="text-meta text-success">Published. Attendees will see it within about a minute.</p>
      <p v-if="state.error" class="text-meta text-danger">Couldn't publish: {{ state.error }}</p>

      <template v-for="r in push.results" :key="r.id">
        <p v-if="r.status === 'sent'" class="text-meta text-success">Push notification sent: “{{ r.title }}”.</p>
        <p v-else-if="r.status === 'failed'" class="text-meta text-danger">Push notification not sent: “{{ r.title }}” ({{ r.error }}). It's tried again the next time you publish.</p>
        <p v-else class="text-meta text-muted">Not sent as a push notification ({{ MAX_PUSHES_PER_PUBLISH }} at most per publish): “{{ r.title }}”.</p>
      </template>
      <p v-if="push.error" class="text-meta text-danger">Push notifications not sent: {{ push.error }} They're tried again the next time you publish.</p>
    </div>
  </div>
</template>
