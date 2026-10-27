<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { DownloadIcon, RefreshCwIcon, SearchIcon, SendIcon, Trash2Icon } from 'lucide-vue-next'
import {
  BREVO_LABELS, accountsSetup, deleteAttendee, loadAttendees, readRequireSignUp, saveRequireSignUp, sendWaitingToBrevo,
  type AccountsSetup, type AttendeeRow,
} from '~/lib/attendees'
import { csvDownload } from '~/lib/reports'
import { errMsg } from '~/lib/util'

// Admins only (lib/access.ts; firestore.rules agree): people who signed up in
// the festival app ("App users"), the "Require sign-up" switch, and Brevo.
const setup = ref<AccountsSetup | null | undefined>(undefined)
const requireSignUp = ref<boolean | null>(null)
const switchBusy = ref(false)
const switchError = ref('')

onMounted(async () => {
  const [s, r] = await Promise.all([accountsSetup(), readRequireSignUp().catch((e) => { switchError.value = errMsg(e); return null })])
  setup.value = s
  requireSignUp.value = r
})

async function toggleRequire(event: Event) {
  const input = event.target as HTMLInputElement
  switchBusy.value = true
  switchError.value = ''
  try {
    await saveRequireSignUp(input.checked)
    requireSignUp.value = input.checked
  } catch (e) {
    switchError.value = `Couldn't save: ${errMsg(e)}`
    input.checked = requireSignUp.value ?? true
  } finally {
    switchBusy.value = false
  }
}

// ---------- The list ----------
const state = reactive({ busy: false, error: '', note: '', people: null as AttendeeRow[] | null })
const search = ref('')

async function load() {
  Object.assign(state, { busy: true, error: '', note: '' })
  try {
    state.people = await loadAttendees()
  } catch (e) {
    state.error = errMsg(e)
  } finally {
    state.busy = false
  }
}

const people = computed(() => state.people ?? [])
const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? people.value.filter((p) => `${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(q)) : people.value
})
const subscribers = computed(() => people.value.filter((p) => p.marketing))
const waiting = computed(() => people.value.filter((p) => p.brevo === 'pending' || p.brevo === 'failed').length)

const when = (d: Date | null) => (d ? d.toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }) : '')
const stamp = () => new Date().toISOString().slice(0, 10)

function download(which: 'users' | 'subscribers') {
  const rows = which === 'users' ? people.value : subscribers.value
  csvDownload(which === 'users' ? `afriff-app-users-${stamp()}.csv` : `afriff-app-subscribers-${stamp()}.csv`, [
    ['First name', 'Last name', 'Email', 'Signed up (Lagos)', 'Festival emails', 'Agreed to', 'Emails choice changed (Lagos)', 'Brevo'],
    ...rows.map((p) => [p.firstName, p.lastName, p.email, when(p.createdAt), p.marketing ? 'Yes' : 'No', p.consentText, when(p.marketingChangedAt), BREVO_LABELS[p.brevo]]),
  ])
}

async function sendToBrevo() {
  Object.assign(state, { busy: true, error: '', note: '' })
  try {
    const r = await sendWaitingToBrevo()
    state.note = `Sent ${r.done} to Brevo${r.failed ? `; ${r.failed} still failing (see each person's Brevo problem)` : ''}.`
    state.people = await loadAttendees()
  } catch (e) {
    state.error = errMsg(e)
  } finally {
    state.busy = false
  }
}

async function remove(p: AttendeeRow) {
  if (!window.confirm(`Delete ${p.firstName} ${p.lastName}'s account (${p.email})? Their festival plan and watched list go too, and they're removed from Brevo. This can't be undone.`)) return
  Object.assign(state, { busy: true, error: '', note: '' })
  try {
    const r = await deleteAttendee(p.uid)
    state.people = people.value.filter((x) => x.uid !== p.uid)
    state.note = r.brevo === 'failed'
      ? `Deleted ${p.email} from the app, but Brevo couldn't be reached: delete the contact in Brevo by hand.`
      : `Deleted ${p.email}.`
  } catch (e) {
    state.error = errMsg(e)
  } finally {
    state.busy = false
  }
}
</script>

<template>
  <div>
    <h1 class="font-display text-h1 font-semibold">Attendees</h1>
    <p class="mt-1 text-muted">People who signed up in the festival app. Only admins can see this page; editors and door volunteers can't.</p>

    <!-- ---------- Sign-up settings ---------- -->
    <section class="card mt-5 flex flex-col gap-4 p-4">
      <label class="flex cursor-pointer items-center gap-4">
        <span class="flex flex-1 flex-col gap-1">
          <span class="text-body font-semibold">Require sign-up</span>
          <span class="text-meta text-muted">
            On: attendees must sign up or log in before they can use the app.
            Off: the sign-up page still shows first, with a "Skip for now" button.
            Reaches phones within about a minute.
          </span>
          <span v-if="switchError" class="text-meta text-danger" role="alert">{{ switchError }}</span>
        </span>
        <input type="checkbox" role="switch" class="peer sr-only" :checked="requireSignUp ?? true" :disabled="requireSignUp === null || switchBusy" @change="toggleRequire">
        <span
          class="relative h-7 w-12 shrink-0 rounded-full bg-raised transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:opacity-50 after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-ink after:shadow after:transition-transform after:content-[''] peer-checked:after:translate-x-5 peer-checked:after:bg-on-accent"
          aria-hidden="true"
        />
      </label>
      <p class="text-meta text-muted">Whatever this says, the app always lets people in when signing up can't work (no signal, or the server can't be reached), and asks again next time.</p>

      <div class="flex flex-col gap-2 border-t border-line pt-4 text-meta">
        <p v-if="setup === undefined" class="text-muted">Checking the server…</p>
        <p v-else-if="setup === null" class="text-danger">Couldn't reach this app's server to check what's set up.</p>
        <template v-else>
          <p class="flex items-start gap-2">
            <UiBadge :tone="setup.accounts ? 'success' : 'danger'">{{ setup.accounts ? 'Ready' : 'Off' }}</UiBadge>
            <span><strong class="font-semibold">Accounts.</strong> {{ setup.accounts ? 'Sign-up and log-in work.' : 'Missing NUXT_ATTENDEE_PIN_SECRET or NUXT_FIREBASE_SERVICE_ACCOUNT on the staff app. Until then the app lets everyone in without an account.' }}</span>
          </p>
          <p class="flex items-start gap-2">
            <UiBadge :tone="setup.email ? 'success' : 'danger'">{{ setup.email ? 'Ready' : 'Off' }}</UiBadge>
            <span><strong class="font-semibold">Forgot PIN emails (Brevo).</strong> {{ setup.email ? 'Codes are emailed.' : 'Missing NUXT_BREVO_API_KEY or NUXT_BREVO_SENDER_EMAIL: people who forget their PIN can\'t reset it.' }}</span>
          </p>
          <p class="flex items-start gap-2">
            <UiBadge :tone="setup.list ? 'success' : 'danger'">{{ setup.list ? 'Ready' : 'Off' }}</UiBadge>
            <span><strong class="font-semibold">"App subscribers" list in Brevo.</strong> {{ setup.list ? (setup.doubleOptIn ? 'People who tick the box are asked to confirm by email, then join the list.' : 'People who tick the box join the list straight away.') : 'Missing NUXT_BREVO_LIST_ID: people who tick the box wait here until you press "Send to Brevo".' }}</span>
          </p>
        </template>
      </div>
    </section>

    <!-- ---------- App users ---------- -->
    <section class="mt-8">
      <h2 class="font-display text-h2 font-semibold">App users</h2>
      <p class="mt-1 text-meta text-muted">Loading reads one record per person, so load when you need it.</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <UiButton size="sm" :disabled="state.busy" @click="load"><RefreshCwIcon /> {{ state.busy ? 'Loading…' : state.people ? 'Refresh' : 'Load the list' }}</UiButton>
        <template v-if="state.people">
          <UiButton size="sm" variant="secondary" :disabled="!people.length" @click="download('users')"><DownloadIcon /> All app users</UiButton>
          <UiButton size="sm" variant="secondary" :disabled="!subscribers.length" @click="download('subscribers')"><DownloadIcon /> App subscribers</UiButton>
          <UiButton v-if="waiting > 0 && setup?.list" size="sm" variant="secondary" :disabled="state.busy" @click="sendToBrevo"><SendIcon /> Send {{ waiting }} to Brevo</UiButton>
        </template>
      </div>
      <p v-if="state.error" class="mt-3 text-meta text-danger" role="alert">{{ state.error }}</p>
      <p v-if="state.note" class="mt-3 rounded-tile bg-accent-soft px-3 py-2 text-meta" role="status">{{ state.note }}</p>

      <template v-if="state.people">
        <div class="mt-4 grid grid-cols-3 gap-2">
          <div v-for="tile in [[people.length, 'signed up'], [subscribers.length, 'said yes to emails'], [waiting, 'waiting for Brevo']]" :key="tile[1]" class="card flex flex-col p-3">
            <span class="font-display text-h1 font-semibold tabular-nums">{{ tile[0] }}</span>
            <span class="text-label text-muted">{{ tile[1] }}</span>
          </div>
        </div>

        <label class="relative mt-4 block">
          <SearchIcon class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input v-model="search" type="search" class="field-input pl-9" placeholder="Search by name or email" aria-label="Search by name or email">
        </label>

        <p v-if="!shown.length" class="mt-4 text-muted">{{ people.length ? 'Nobody matches.' : 'Nobody has signed up yet.' }}</p>
        <ul class="mt-2 divide-y divide-line">
          <li v-for="p in shown.slice(0, 300)" :key="p.uid" class="flex items-start gap-3 py-3">
            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="truncate font-semibold">{{ p.firstName }} {{ p.lastName }}</span>
              <span class="truncate text-meta text-muted">{{ p.email }}</span>
              <span class="flex flex-wrap items-center gap-1.5 text-label text-muted">
                Signed up {{ when(p.createdAt) }}
                <UiBadge :tone="p.marketing ? 'success' : 'neutral'">{{ p.marketing ? 'Emails: yes' : 'Emails: no' }}</UiBadge>
                <UiBadge v-if="p.brevo !== 'off'" :tone="p.brevo === 'failed' ? 'danger' : 'neutral'" :title="p.brevoError || undefined">Brevo: {{ BREVO_LABELS[p.brevo] }}</UiBadge>
              </span>
              <span v-if="p.brevo === 'failed' && p.brevoError" class="text-label text-danger">{{ p.brevoError }}</span>
            </span>
            <button type="button" class="pressable grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger" :aria-label="`Delete ${p.firstName} ${p.lastName}'s account`" :disabled="state.busy" @click="remove(p)">
              <Trash2Icon class="size-4" />
            </button>
          </li>
        </ul>
        <p v-if="shown.length > 300" class="mt-2 text-meta text-muted">Showing the newest 300 of {{ shown.length }}. Search to find someone, or download the spreadsheet.</p>
      </template>
    </section>
  </div>
</template>
