<script setup lang="ts">
import { reactive } from 'vue'
import { CheckIcon, XIcon } from 'lucide-vue-next'
import { COLLECTIONS, getField, isCollection } from './schema'
import type { ChangeDoc, Profile } from './types'
import { errMsg, whenLagos } from './util'

import { approveChange, rejectChange, useChanges } from './data'

// Admins: editors' changes waiting for approval, with only the fields that differ.
const props = defineProps<{ profile: Profile }>()
const changes = useChanges({ pendingOnly: true })

const show = (v: unknown) => {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  if (v == null || v === '') return '—'
  return String(v)
}
function diffRows(change: ChangeDoc) {
  const fields = isCollection(change.collection) ? COLLECTIONS[change.collection].fields : []
  return fields
    .map((f) => ({ f, before: getField(change.before, f.key), after: getField(change.data, f.key) }))
    .filter(({ before, after }) => show(before) !== show(after))
}
const when = whenLagos
const title = (c: string) => (isCollection(c) ? COLLECTIONS[c].title : c)

const busy = reactive<Record<string, boolean>>({})
const errors = reactive<Record<string, string>>({})
async function act(change: ChangeDoc, fn: () => Promise<unknown>) {
  busy[change.id] = true
  errors[change.id] = ''
  try {
    await fn()
  } catch (e) {
    errors[change.id] = errMsg(e)
    busy[change.id] = false
  }
}
function reject(change: ChangeDoc) {
  const note = window.prompt('Reason for rejecting (optional, the editor will see it):', '')
  if (note !== null) act(change, () => rejectChange(change, props.profile, note))
}
</script>

<template>
  <div>
    <h1 class="font-display text-h1 font-semibold">Approvals</h1>
    <p class="mt-1 text-muted">Changes from editors. Approving saves the change in the database (attendees see it after Publish to app); rejecting sends it back with your note.</p>
    <p v-if="changes.error" class="mt-3 text-meta text-danger">{{ changes.error }}</p>
    <p v-if="changes.items == null" class="mt-3 text-muted">Loading…</p>
    <p v-if="changes.items?.length === 0" class="mt-3 text-success">Nothing waiting. You're all caught up.</p>
    <div class="mt-4 flex flex-col gap-3">
      <div v-for="ch in changes.items || []" :key="ch.id" class="card flex flex-col gap-3 p-4">
        <div class="flex flex-col gap-0.5">
          <span class="font-semibold">{{ ch.summary }}</span>
          <span class="text-meta text-muted">{{ title(ch.collection) }} · by {{ ch.submittedByName }} · {{ when(ch.submittedAt) }}</span>
        </div>
        <p v-if="ch.action === 'delete'" class="font-semibold text-danger">Delete this item.</p>
        <p v-else-if="diffRows(ch).length === 0" class="text-meta text-muted">No visible changes.</p>
        <dl v-else class="flex flex-col gap-2">
          <div v-for="r in diffRows(ch)" :key="r.f.key" class="rounded-tile bg-raised px-3 py-2 text-meta">
            <dt class="text-label font-semibold text-muted">{{ r.f.label }}</dt>
            <dd v-if="ch.action === 'update'" class="text-danger line-through">{{ show(r.before) }}</dd>
            <dd class="text-success">{{ show(r.after) }}</dd>
          </div>
        </dl>
        <p v-if="errors[ch.id]" class="text-meta text-danger">{{ errors[ch.id] }}</p>
        <div class="flex gap-2">
          <UiButton size="sm" :disabled="busy[ch.id]" @click="act(ch, () => approveChange(ch, profile))"><CheckIcon /> Approve</UiButton>
          <UiButton size="sm" variant="secondary" :disabled="busy[ch.id]" @click="reject(ch)"><XIcon /> Reject</UiButton>
        </div>
      </div>
    </div>
  </div>
</template>
