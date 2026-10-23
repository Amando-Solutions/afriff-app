<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { BellIcon, ChevronLeftIcon } from 'lucide-vue-next'
import { dayLabel, timeLabel } from '~/lib/format.js'
import { COLLECTIONS, fromForm, slugify, toForm } from './schema.js'
import { deleteItem, saveItem, useCollection } from './data.js'
import { useRefs } from './refs.js'
import AdminField from './AdminField.vue'

// Edit (or create) one item. Admins save straight away; editors send it for approval.
const props = defineProps({ col: { type: String, required: true }, id: { type: String, required: true }, profile: { type: Object, required: true } })
const c = COLLECTIONS[props.col]
const { state, map } = useCollection(props.col)
const refs = useRefs(props.col)
const isNew = props.id === 'new'
const existing = computed(() => (isNew ? null : map.value[props.id]))
const values = ref(null)
const status = reactive({ busy: false, msg: '', error: '' })
const alertDraft = ref(null)

// fill the form once the item has loaded
watch(existing, (e) => {
  if (values.value == null && (isNew || e)) values.value = isNew ? toForm(props.col, {}) : toForm(props.col, e)
}, { immediate: true })
const missing = computed(() => !isNew && state.items && !existing.value)

const strip = (doc) => {
  if (!doc) return null
  const { id: _id, ...rest } = doc
  return rest
}

// ---------- "Tell attendees?" after changing when or where something happens ----------
const CHANGE_KEYS = ['date', 'time', 'venue', 'screen', 'place', 'status']
function suggestAlert(before, after) {
  const col = props.col
  const r = refs.value
  if (!before || (col !== 'screenings' && col !== 'events')) return null
  if (!CHANGE_KEYS.some((k) => (before[k] || '') !== (after[k] || ''))) return null
  const title = col === 'screenings' ? r.films?.[after.film]?.title || 'Screening' : after.title
  const where = [r.venues?.[after.venue]?.name, after.screen || after.place].filter(Boolean).join(', ')
  const when = `${after.date ? dayLabel(after.date) : ''} at ${after.time ? timeLabel(after.time) : ''}`
  let draft
  if (after.status === 'cancelled' && before.status !== 'cancelled') {
    draft = { type: 'cancelled', title: `${title} cancelled`, body: `${title} (${when}${where ? `, ${where}` : ''}) has been cancelled.` }
  } else if ((before.venue || '') !== (after.venue || '') || (before.screen || before.place || '') !== (after.screen || after.place || '') || after.status === 'moved') {
    draft = { type: 'venue-change', title: `${title} moved`, body: `${title} is now at ${where}, ${when}.` }
  } else {
    draft = { type: 'time-change', title: `${title}: new time`, body: `${title} is now ${when}${where ? `, ${where}` : ''}.` }
  }
  return { ...draft, [col === 'screenings' ? 'screening' : 'event']: after.__id }
}
const alertState = reactive({ busy: false, msg: '', error: '' })
async function postAlert() {
  Object.assign(alertState, { busy: true, msg: '', error: '' })
  try {
    const { __id, ...clean } = alertDraft.value
    const news = { ...clean, urgent: true, time: new Date().toISOString(), url: '', until: '' }
    const id = `alert-${Date.now().toString(36)}`
    const result = await saveItem({ profile: props.profile, col: 'news', id, data: news, before: null, summary: `New alert: ${news.title}` })
    Object.assign(alertState, { busy: false, msg: result === 'saved' ? 'Alert saved. Press Publish to app so attendees see it.' : 'Alert sent for approval.' })
    setTimeout(() => { alertDraft.value = null }, 2500)
  } catch (e) {
    Object.assign(alertState, { busy: false, error: e.message })
  }
}

async function save() {
  Object.assign(status, { busy: true, msg: '', error: '' })
  try {
    const formData = fromForm(props.col, values.value)
    // keep fields the form doesn't show (e.g. a film's placeholder poster colours)
    const data = { ...(strip(existing.value) || {}), ...formData }
    if (!formData.link) delete data.link
    const label = c.label(data, refs.value)
    const docId = isNew ? `${slugify(c.idFrom ? data[c.idFrom] : label)}-${Math.random().toString(36).slice(2, 6)}` : props.id
    const result = await saveItem({ profile: props.profile, col: props.col, id: docId, data, before: strip(existing.value), summary: `${isNew ? 'New' : 'Edit'} ${c.single}: ${label}` })
    Object.assign(status, { busy: false, msg: result === 'saved' ? 'Saved in the database. Attendees see it after an admin presses Publish to app.' : 'Sent for approval. An admin will review it.' })
    alertDraft.value = suggestAlert(strip(existing.value), { ...data, __id: docId })
    Object.assign(alertState, { busy: false, msg: '', error: '' })
    if (isNew && result === 'saved') navigateTo(`/admin/data/${props.col}/${encodeURIComponent(docId)}`, { replace: true })
  } catch (err) {
    Object.assign(status, { busy: false, error: `Couldn't save: ${err.message}` })
  }
}

async function remove() {
  if (!window.confirm(`Delete this ${c.single}? ${props.profile.role === 'admin' ? 'This can\'t be undone.' : 'An admin will need to approve it.'}`)) return
  Object.assign(status, { busy: true, msg: '', error: '' })
  try {
    const result = await deleteItem({ profile: props.profile, col: props.col, id: props.id, before: strip(existing.value), summary: `Delete ${c.single}: ${c.label(existing.value, refs.value)}` })
    if (result === 'saved') navigateTo(`/admin/data/${props.col}`)
    else Object.assign(status, { busy: false, msg: 'Deletion sent for approval.' })
  } catch (err) {
    Object.assign(status, { busy: false, error: `Couldn't delete: ${err.message}` })
  }
}
</script>

<template>
  <div>
    <NuxtLink :to="`/admin/data/${col}`" class="mb-2 inline-flex items-center gap-1 text-meta font-medium text-muted hover:text-ink"><ChevronLeftIcon class="size-4" /> {{ c.title }}</NuxtLink>
    <p v-if="missing" class="mt-2 text-muted">This {{ c.single }} doesn't exist (it may have been deleted).</p>
    <p v-else-if="values == null" class="mt-2 text-muted">Loading…</p>
    <template v-else>
      <h1 class="font-display text-h1 font-semibold">{{ isNew ? `New ${c.single}` : c.label(existing, refs) }}</h1>
      <p v-if="profile.role !== 'admin'" class="mt-3 rounded-tile bg-raised px-3.5 py-2.5 text-meta text-muted">You're an editor: saving sends this to an admin for approval.</p>
      <form class="mt-5 flex flex-col gap-4" @submit.prevent="save">
        <AdminField v-for="f in c.fields" :key="f.key" v-model="values[f.key]" :f="f" :refs="refs" />
        <p v-if="status.error" class="text-meta text-danger" role="alert">{{ status.error }}</p>
        <p v-if="status.msg" class="text-meta text-success" role="status">{{ status.msg }}</p>
        <div class="flex flex-wrap gap-2.5">
          <UiButton type="submit" size="lg" :disabled="status.busy">{{ status.busy ? 'Saving…' : profile.role === 'admin' ? 'Save' : 'Send for approval' }}</UiButton>
          <UiButton v-if="!isNew" variant="danger" size="lg" :disabled="status.busy" @click="remove">Delete</UiButton>
        </div>
      </form>

      <div v-if="alertDraft" class="card mt-6 flex flex-col gap-3 border-accent/50 p-4">
        <h2 class="flex items-center gap-2 text-h3 font-semibold"><BellIcon class="size-[1.125rem] text-accent-ink" /> Tell attendees?</h2>
        <p class="text-meta text-muted">You changed when or where this happens. Post an urgent alert? It shows as a banner on Home and in News, linked to this item.</p>
        <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">Headline<input v-model="alertDraft.title" class="field-input" /></label>
        <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">Message<textarea v-model="alertDraft.body" rows="3" class="field-input" /></label>
        <p v-if="alertState.error" class="text-meta text-danger">{{ alertState.error }}</p>
        <p v-if="alertState.msg" class="text-meta text-success">{{ alertState.msg }}</p>
        <div class="flex gap-2">
          <UiButton size="sm" :disabled="alertState.busy || !!alertState.msg" @click="postAlert">{{ alertState.busy ? 'Posting…' : 'Post alert' }}</UiButton>
          <UiButton size="sm" variant="secondary" :disabled="alertState.busy" @click="alertDraft = null">No thanks</UiButton>
        </div>
      </div>
    </template>
  </div>
</template>
