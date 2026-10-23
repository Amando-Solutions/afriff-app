<script setup>
import { useChanges } from './data.js'

// Editors: everything they've sent for approval, newest first.
const props = defineProps({ profile: { type: Object, required: true } })
const changes = useChanges({ mineUid: props.profile.id })
const STATUS = { pending: 'Waiting for approval', approved: 'Approved', rejected: 'Rejected' }
const TONE = { pending: 'accent', approved: 'success', rejected: 'danger' }
const when = (ts) => (ts?.seconds ? new Date(ts.seconds * 1000).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }) : 'just now')
</script>

<template>
  <div>
    <h1 class="font-display text-h1 font-semibold">My changes</h1>
    <p class="mt-1 text-muted">Everything you've sent for approval, newest first.</p>
    <p v-if="changes.error" class="mt-3 text-meta text-danger">{{ changes.error }}</p>
    <p v-if="changes.items == null" class="mt-3 text-muted">Loading…</p>
    <p v-if="changes.items?.length === 0" class="mt-3 text-muted">You haven't sent any changes yet. Open Festival data to start.</p>
    <div class="mt-4 flex flex-col gap-3">
      <div v-for="c in changes.items || []" :key="c.id" class="card flex flex-col gap-1.5 p-4">
        <div class="flex items-start justify-between gap-3">
          <span class="font-semibold">{{ c.summary }}</span>
          <UiBadge :tone="TONE[c.status] || 'neutral'">{{ STATUS[c.status] || c.status }}</UiBadge>
        </div>
        <span class="text-meta text-muted">Sent {{ when(c.submittedAt) }}{{ c.reviewedByName ? ` · reviewed by ${c.reviewedByName}` : '' }}</span>
        <p v-if="c.note" class="rounded-tile bg-raised px-3 py-2 text-meta text-muted">Note from admin: {{ c.note }}</p>
      </div>
    </div>
  </div>
</template>
