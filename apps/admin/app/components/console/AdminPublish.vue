<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { collection, doc, getDoc, getDocs, onSnapshot, writeBatch, type Timestamp } from 'firebase/firestore'
import type { Profile } from '~/lib/types'
import { errMsg, whenLagos } from '~/lib/util'
import { BellRingIcon, SendIcon } from 'lucide-vue-next'
import { db } from '~/lib/firebase'
import { COLLECTIONS, isCollection } from '~/lib/schema'
import { publishToApp } from '~/lib/publish'
import { nextPushes, sendDuePushes } from '~/lib/push'
import { MAX_PUSHES_PER_PUBLISH, type PushOutcome } from '#shared/push'
import { alertNews, changeAlerts, type ChangeAlert } from '#shared/changeAlerts'

interface PublishedInfo { version?: number; counts?: Record<string, number>; publishedAt?: Timestamp; publishedByName?: string }
const props = defineProps<{ profile: Profile }>()
// undefined = still loading, null = never published
const current = ref<PublishedInfo | null | undefined>(undefined)
const state = reactive({ busy: false, done: null as Awaited<ReturnType<typeof publishToApp>> | null, error: '' })
// Announcements ticked "Send as a push notification" that this publish will send
const upcoming = ref<Awaited<ReturnType<typeof nextPushes>> | null>(null)
const push = reactive({ busy: false, results: [] as PushOutcome[], error: '' })

// Screenings and events whose day, time, place or status changed since the last
// publish (shared/changeAlerts.ts): each ticked one is posted as an urgent alert
// just before publishing, so it goes out as a push with this publish.
const changes = ref<ChangeAlert[] | null>(null)
const ticked = reactive<Record<string, boolean>>({})
const tickedAlerts = () => (changes.value ?? []).filter((a) => ticked[a.itemId])
/** keepTicks: the admin's own ticks stay; items found since follow the usual rule */
async function loadChanges(keepTicks = false) {
  try {
    const rows = async (col: string) => (await getDocs(collection(db, col))).docs.map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>)
    const [pub, screenings, events, news, films, venues] = await Promise.all([
      getDoc(doc(db, 'published', 'current')), rows('screenings'), rows('events'), rows('news'), rows('films'), rows('venues'),
    ])
    const json = pub.exists() ? pub.get('json') : null
    const byId = <T,>(list: Record<string, unknown>[]) => Object.fromEntries(list.map((d) => [String(d.id), d as T]))
    const list = changeAlerts(typeof json === 'string' ? JSON.parse(json) : null, { screenings, events, news }, { films: byId(films), venues: byId(venues) })
    // a few: ticked. Many at once (e.g. a new timetable): the admin picks.
    const chosen: Record<string, boolean> = keepTicks ? { ...ticked } : {}
    for (const k of Object.keys(ticked)) delete ticked[k]
    for (const a of list) ticked[a.itemId] = a.itemId in chosen ? chosen[a.itemId]! : list.length <= MAX_PUSHES_PER_PUBLISH
    changes.value = list
  } catch {
    changes.value = null // can't be worked out now: publishing still works
  }
}

const stop = onSnapshot(
  doc(db, 'published', 'current'),
  (snap) => { current.value = snap.exists() ? (snap.data() as PublishedInfo) : null },
  (e) => { state.error = errMsg(e) },
)
onBeforeUnmount(stop)

// null when it can't be worked out (e.g. the database rules aren't updated yet): the server still decides
const loadUpcoming = () => nextPushes().catch(() => null)
onMounted(async () => { [upcoming.value] = await Promise.all([loadUpcoming(), loadChanges()]) })
// back on this tab after editing in another one: look again
const onVisible = () => { if (document.visibilityState === 'visible' && !state.busy) void loadChanges(true) }
onMounted(() => document.addEventListener('visibilitychange', onVisible))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

async function run() {
  // worked out again now: something may have been edited since this page opened
  const [due] = await Promise.all([loadUpcoming(), loadChanges(true)])
  upcoming.value = due
  const alerts = tickedAlerts()
  const pushes = Math.min(MAX_PUSHES_PER_PUBLISH, (due?.send.length ?? 0) + alerts.length)
  const alertNote = alerts.length ? `\n\nIt posts ${plural(alerts.length, 'alert')} (News, Home banner): ${alerts.map((a) => `“${a.title}”`).join(', ')}.` : ''
  const pushNote = pushes ? `\n\nIt sends ${plural(pushes, 'push notification')} to every phone with alerts on.` : ''
  if (!window.confirm(`Publish the current festival data to the attendee app? Open phones pick it up within seconds.${alertNote}${pushNote}`)) return
  Object.assign(state, { busy: true, done: null, error: '' })
  Object.assign(push, { busy: false, results: [], error: '' })
  try {
    if (alerts.length) {
      const batch = writeBatch(db)
      const now = new Date()
      alerts.forEach((a, i) => batch.set(doc(db, 'news', `alert-${(now.getTime() + i).toString(36)}`), alertNews(a, now)))
      await batch.commit()
    }
    Object.assign(state, { busy: false, done: await publishToApp(props.profile) })
  } catch (e) {
    Object.assign(state, { busy: false, error: errMsg(e) })
    return
  }
  void loadChanges()
  // Published: now the notifications, from what attendees can see. Skipped when
  // nothing is ticked, so an unset-up server doesn't show an error on every publish.
  if (due && !due.send.length && !due.skip.length && !alerts.length) return
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

      <!-- changed screenings and events: an alert each, ticked = posted and pushed with this publish -->
      <div v-if="changes?.length" class="flex flex-col gap-2 rounded-tile bg-raised px-3 py-2.5 text-meta">
        <p class="flex items-center gap-2 font-semibold"><BellRingIcon class="size-4 text-accent-ink" /> {{ changes.length === 1 ? '1 change' : `${changes.length} changes` }} since the last publish: tell attendees?</p>
        <p class="text-muted">
          Each ticked one is posted as an urgent alert (banner on Home, in News) and sent as a push notification to every phone with alerts on, logged in or not.
          <template v-if="changes.length > MAX_PUSHES_PER_PUBLISH"> That's a lot at once (a new timetable?), so none are ticked: tick the ones attendees must hear about. At most {{ MAX_PUSHES_PER_PUBLISH }} go as push notifications per publish; the rest still show in News.</template>
        </p>
        <label v-for="a in changes" :key="a.itemId" class="flex items-start gap-2.5">
          <input v-model="ticked[a.itemId]" type="checkbox" class="mt-1 size-4 shrink-0 accent-[var(--c-accent)]" />
          <span><span class="font-semibold text-ink">{{ a.title }}</span><span class="block text-muted">{{ a.body }}</span></span>
        </label>
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
