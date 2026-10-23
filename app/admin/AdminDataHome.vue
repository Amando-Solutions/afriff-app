<script setup>
import { reactive } from 'vue'
import { ChevronRightIcon, DownloadCloudIcon, SaveIcon } from 'lucide-vue-next'
import { COLLECTIONS, COLLECTION_ORDER } from './schema.js'
import { downloadBackup, importAll, useCollection } from './data.js'

// Festival data home: one card per kind of data, plus import and backup for admins.
defineProps({ profile: { type: Object, required: true } })

const counts = Object.fromEntries(COLLECTION_ORDER.map((name) => [name, useCollection(name)]))
const listCounts = (c) =>
  Object.entries(c).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${(COLLECTIONS[k]?.title || k).toLowerCase()}`).join(', ')

const imp = reactive({ busy: false, done: null, error: '', progress: '' })
async function runImport() {
  Object.assign(imp, { busy: true, done: null, error: '', progress: 'Checking what\'s already there…' })
  try {
    const done = await importAll((n, total) => { imp.progress = `${n} of ${total} added…` })
    Object.assign(imp, { busy: false, done, progress: '' })
  } catch (e) {
    Object.assign(imp, { busy: false, error: e.message, progress: '' })
  }
}
const importAdded = () => listCounts(imp.done.added)
const importKept = () => Object.values(imp.done.kept).reduce((a, b) => a + b, 0)

const backup = reactive({ busy: false, done: null, error: '' })
async function runBackup() {
  Object.assign(backup, { busy: true, done: null, error: '' })
  try {
    Object.assign(backup, { busy: false, done: await downloadBackup() })
  } catch (e) {
    Object.assign(backup, { busy: false, error: e.message })
  }
}
</script>

<template>
  <div>
    <h1 class="font-display text-h1 font-semibold">Festival data</h1>
    <p class="mt-1 text-muted">
      {{ profile.role === 'admin'
        ? 'Your changes are saved in the database straight away. Attendees see them after you press Publish to app.'
        : 'Your changes are sent to an admin for approval before attendees see them.' }}
    </p>

    <template v-if="profile.role === 'admin'">
      <div class="card mt-4 flex flex-col gap-2.5 p-4">
        <h2 class="flex items-center gap-2 text-h3 font-semibold"><DownloadCloudIcon class="size-5 text-accent-ink" /> Festival data from afriff.com</h2>
        <p class="text-meta text-muted">
          Copies the films, events, venues, partners and How to attend text collected from afriff.com (plus sample times) into the database. It only adds what's missing (whole items, or new fields like sponsor logos): anything already filled in, including your team's edits, is never overwritten, so it's safe to press again.
        </p>
        <UiButton size="sm" class="self-start" :disabled="imp.busy" @click="runImport">{{ imp.busy ? imp.progress : 'Add missing festival data' }}</UiButton>
        <p v-if="imp.done" class="text-meta text-success">
          {{ importAdded() ? `Added ${importAdded()}.` : 'No items were missing.' }}
          {{ imp.done.filled ? `Filled in ${imp.done.filled} new field${imp.done.filled === 1 ? '' : 's'} (such as sponsor logos) on existing items. ` : '' }}
          {{ importKept() ? 'Everything your team already entered was left as it is.' : '' }}
        </p>
        <p v-if="imp.error" class="text-meta text-danger">Couldn't load: {{ imp.error }}</p>
      </div>

      <div class="card mt-3 flex flex-col gap-2.5 p-4">
        <h2 class="flex items-center gap-2 text-h3 font-semibold"><SaveIcon class="size-5 text-accent-ink" /> Backup</h2>
        <p class="text-meta text-muted">Saves a copy of everything in the database (films, screenings, events, venues, news, sponsors, How to attend, queue counts) as a file on this device. Do this before launch and before big edit days.</p>
        <UiButton size="sm" variant="secondary" class="self-start" :disabled="backup.busy" @click="runBackup">{{ backup.busy ? 'Preparing…' : 'Download backup' }}</UiButton>
        <p v-if="backup.done" class="text-meta text-success">Downloaded: {{ listCounts(backup.done) }}.</p>
        <p v-if="backup.error" class="text-meta text-danger">Couldn't make the backup: {{ backup.error }}</p>
      </div>
    </template>

    <div class="mt-4 grid gap-2.5 sm:grid-cols-2">
      <NuxtLink v-for="name in COLLECTION_ORDER" :key="name" :to="`/admin/data/${name}`" class="card card-interactive flex items-center gap-3 p-4">
        <span class="flex flex-1 flex-col gap-0.5">
          <span class="text-body font-semibold">{{ COLLECTIONS[name].title }}</span>
          <span class="text-meta text-muted">{{ counts[name].state.items == null ? 'Loading…' : `${counts[name].state.items.length} in the database` }}</span>
        </span>
        <ChevronRightIcon class="size-5 text-muted" />
      </NuxtLink>
    </div>
  </div>
</template>
