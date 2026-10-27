<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { RefreshCwIcon } from 'lucide-vue-next'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '~/lib/firebase'
import { useChanges, useCollection } from '~/lib/data'
import { whenLagos } from '~/lib/util'

// Admins: what the afriff.com sync (Cloud Function syncFromAfriff, functions/) last
// did. It writes sync/afriff after every check; times are ms since 1970.
interface SyncStatus {
  checkedAt: number
  result: 'unchanged' | 'learned' | 'updated' | 'nothing-new' | 'error'
  error: string
  filmCount: number
  changedAt: number | null
  lastChange: { at: number; updated: number; added: number; proposed: number; films: string[] } | null
  schedule: { timesListed: boolean; changedAt: number | null } | null
  newFields: string[]
  goneFromAfriff: string[]
}

// loading | off (never ran) | rules (can't read it yet) | ok
const state = ref<'loading' | 'off' | 'rules' | 'ok'>('loading')
const status = ref<SyncStatus | null>(null)
const publishedVersion = ref(0)
const stops = [
  onSnapshot(
    doc(db, 'sync', 'afriff'),
    (snap) => { status.value = snap.exists() ? (snap.data() as SyncStatus) : null; state.value = snap.exists() ? 'ok' : 'off' },
    () => { state.value = 'rules' },
  ),
  onSnapshot(doc(db, 'published', 'version'), (snap) => { publishedVersion.value = Number(snap.data()?.version) || 0 }, () => {}),
]
onBeforeUnmount(() => stops.forEach((stop) => stop()))

const changes = useChanges({ pendingOnly: true })
const waiting = computed(() => (changes.items ?? []).filter((c) => c.submittedBy === 'afriff-sync').length)
const films = useCollection('films')

const when = (ms: number | null | undefined) => whenLagos(ms ? { seconds: Math.floor(ms / 1000) } : null, '')
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`
const s = computed(() => status.value)
const resultText = computed(() => {
  switch (s.value?.result) {
    case 'unchanged': return 'nothing new on afriff.com.'
    case 'nothing-new': return 'afriff.com updated its list; nothing here needed changing.'
    case 'learned': return `first check done: ${s.value.filmCount} films noted. From now on, changes AFRIFF makes on afriff.com are followed here.`
    case 'updated': return 'changes copied (see below).'
    case 'error': return 'it failed.'
    default: return ''
  }
})
// it runs every 15 minutes: much longer than that means it has stopped
const stale = computed(() => !!s.value && Date.now() - s.value.checkedAt > 45 * 60_000)
const changeText = computed(() => {
  const c = s.value?.lastChange
  if (!c) return ''
  const parts = [c.updated && `${plural(c.updated, 'film')} updated`, c.added && `${plural(c.added, 'film')} added`, c.proposed && `${plural(c.proposed, 'change')} sent to Approvals`].filter(Boolean)
  return `${parts.join(', ')}${c.films.length ? ` (${c.films.join(', ')})` : ''}`
})
const unpublished = computed(() => !!s.value?.changedAt && s.value.changedAt > publishedVersion.value)
const goneTitles = computed(() => (s.value?.goneFromAfriff ?? []).map((id) => String(films.map.value[id]?.title ?? id)))
</script>

<template>
  <div class="card mt-4 flex flex-col gap-2.5 p-4">
    <h2 class="flex items-center gap-2 text-h3 font-semibold"><RefreshCwIcon class="size-5 text-accent-ink" /> afriff.com sync</h2>
    <p class="text-meta text-muted">
      Every 15 minutes the app checks afriff.com's film list. When AFRIFF changes a film there (synopsis, poster, title, running time…), the change is copied here,
      unless your team has edited that same detail: then it waits in Approvals for you to decide. New films are added; nothing is ever deleted.
      Attendees see the changes after Publish to app.
    </p>

    <p v-if="state === 'loading'" class="text-meta text-muted">Checking…</p>
    <p v-else-if="state === 'off'" class="rounded-tile bg-raised px-3 py-2 text-meta text-muted">Not running yet. It starts once the cloud function is deployed (it needs Firebase's Blaze plan).</p>
    <p v-else-if="state === 'rules'" class="rounded-tile bg-raised px-3 py-2 text-meta text-muted">Can't show the sync's status yet: the database rules need publishing (<code>npm run deploy:rules</code>).</p>

    <template v-else-if="s">
      <p class="text-meta">Last check {{ when(s.checkedAt) }}: {{ resultText }}</p>
      <p v-if="s.result === 'error'" class="text-meta text-danger">{{ s.error }} Nothing was changed; it tries again at the next check.</p>
      <p v-if="stale" class="text-meta text-danger">No check for over 45 minutes: the sync may have stopped. Look at Firebase console → Functions → syncFromAfriff → Logs.</p>
      <p v-if="changeText" class="text-meta text-muted">Last change from afriff.com, {{ when(s.lastChange?.at) }}: {{ changeText }}.</p>

      <div v-if="unpublished || waiting" class="flex flex-wrap gap-2">
        <UiButton v-if="unpublished" size="sm" to="/admin/publish">Not on phones yet: Publish to app</UiButton>
        <UiButton v-if="waiting" size="sm" variant="secondary" to="/admin/approvals">{{ plural(waiting, 'afriff.com change') }} in Approvals</UiButton>
      </div>

      <p class="text-meta text-muted">
        <template v-if="s.schedule?.timesListed">afriff.com's schedule page may now list screening times (changed {{ when(s.schedule.changedAt) || 'recently' }}). The sync doesn't copy times yet: enter them in Screenings, or ask the developer to add them to the sync.</template>
        <template v-else>afriff.com hasn't published screening times yet. The app's times are still samples.</template>
      </p>
      <p v-if="s.newFields?.length" class="text-meta text-muted">afriff.com's films now carry new details ({{ s.newFields.join(', ') }}). If that's the timetable, ask the developer to add it to the sync.</p>
      <p v-if="goneTitles.length" class="text-meta text-muted">No longer listed on afriff.com (still in the app until you remove them): {{ goneTitles.join(', ') }}.</p>
    </template>
  </div>
</template>
