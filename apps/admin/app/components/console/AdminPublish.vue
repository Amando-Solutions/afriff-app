<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from 'vue'
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore'
import type { Profile } from '~/lib/types'
import { errMsg, whenLagos } from '~/lib/util'
import { SendIcon } from 'lucide-vue-next'
import { db } from '~/lib/firebase'
import { COLLECTIONS, isCollection } from '~/lib/schema'
import { publishToApp } from '~/lib/publish'

interface PublishedInfo { version?: number; counts?: Record<string, number>; publishedAt?: Timestamp; publishedByName?: string }
const props = defineProps<{ profile: Profile }>()
// undefined = still loading, null = never published
const current = ref<PublishedInfo | null | undefined>(undefined)
const state = reactive({ busy: false, done: null as Awaited<ReturnType<typeof publishToApp>> | null, error: '' })

const stop = onSnapshot(
  doc(db, 'published', 'current'),
  (snap) => { current.value = snap.exists() ? (snap.data() as PublishedInfo) : null },
  (e) => { state.error = errMsg(e) },
)
onBeforeUnmount(stop)

async function run() {
  if (!window.confirm('Publish the current festival data to the attendee app? Open phones pick it up within seconds.')) return
  Object.assign(state, { busy: true, done: null, error: '' })
  try {
    Object.assign(state, { busy: false, done: await publishToApp(props.profile) })
  } catch (e) {
    Object.assign(state, { busy: false, error: errMsg(e) })
  }
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
      <UiButton size="lg" class="self-start" :disabled="state.busy" @click="run"><SendIcon /> {{ state.busy ? 'Publishing…' : 'Publish to app' }}</UiButton>
      <p v-if="state.done" class="text-meta text-success">Published. Attendees will see it within about a minute.</p>
      <p v-if="state.error" class="text-meta text-danger">Couldn't publish: {{ state.error }}</p>
    </div>
  </div>
</template>
