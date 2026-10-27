<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { CrownIcon, DownloadIcon, ListChecksIcon, PrinterIcon, RefreshCwIcon, UserPlusIcon } from 'lucide-vue-next'
import { CONSENT_LABEL, SOURCE_LABEL, byName, type Person, type Source } from '#shared/contacts'
import { canOpen } from '~/lib/access'
import { createGroup, groupNameProblem, loadPeople, setMembership, watchGroups, watchVipLinks, type Group, type VipLink } from '~/lib/contacts'
import { csvDownload } from '~/lib/reports'
import { matchesSearch, searchWords } from '~/lib/search'
import { useAdminAuth } from '~/lib/useAdminAuth'
import { errMsg } from '~/lib/util'

// Admins and editors (lib/access.ts; firestore.rules agree): everyone AFRIFF
// can invite, as one list. App sign-ups appear by themselves; guests can be
// added by hand; VIP links (admins) add people to a group as they sign up.
// Who may be emailed: shared/contacts.ts. Invitations: AdminInvites.vue.
const auth = useAdminAuth()
const isAdmin = computed(() => auth.profile?.role === 'admin')

const state = reactive({ busy: false, error: '', note: '', people: null as Person[] | null })
const groups = ref<Group[]>([])
const links = ref<VipLink[]>([])
const watchError = ref('')

async function load() {
  Object.assign(state, { busy: true, error: '' })
  try {
    state.people = (await loadPeople()).sort(byName)
  } catch (e) {
    state.error = errMsg(e)
  } finally {
    state.busy = false
  }
}
onMounted(load)
const stops = [watchGroups((g) => { groups.value = g }, (e) => { watchError.value = errMsg(e) })]
if (isAdmin.value) stops.push(watchVipLinks((l) => { links.value = l }, (e) => { watchError.value = errMsg(e) }))
onBeforeUnmount(() => stops.forEach((s) => s()))

const people = computed(() => state.people ?? [])
const groupName = (id: string) => groups.value.find((g) => g.id === id)?.name ?? ''
const membersOf = (id: string) => people.value.filter((p) => p.groups.includes(id))

// ---------- Filters ----------
const f = reactive({ search: '', group: '' as string, vip: false, email: '' as '' | 'yes' | 'no', source: '' as '' | Source })
const shown = computed(() => {
  const words = searchWords(f.search)
  return people.value.filter((p) =>
    matchesSearch(words, p.firstName, p.lastName, p.email)
    && (!f.group || (f.group === 'none' ? !p.groups.some((g) => groupName(g)) : p.groups.includes(f.group)))
    && (!f.vip || p.vip)
    && (!f.email || (f.email === 'yes') === p.canEmail)
    && (!f.source || p.source === f.source))
})
const LIMIT = 300

// ---------- Ticking people in and out of groups ----------
const picked = ref(new Set<string>())
const toggle = (key: string) => {
  const next = new Set(picked.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  picked.value = next
}
const allShownPicked = computed(() => shown.value.length > 0 && shown.value.slice(0, LIMIT).every((p) => picked.value.has(p.key)))
function pickAllShown() {
  picked.value = allShownPicked.value ? new Set() : new Set(shown.value.slice(0, LIMIT).map((p) => p.key))
}
const bulkGroup = ref('')

async function bulk(add: boolean) {
  const g = groups.value.find((x) => x.id === bulkGroup.value)
  if (!g) { state.error = 'Choose the group first.'; return }
  const chosen = people.value.filter((p) => picked.value.has(p.key))
  Object.assign(state, { busy: true, error: '', note: '' })
  try {
    await setMembership(chosen, g.id, add)
    const n = add ? chosen.length : chosen.filter((p) => p.groups.includes(g.id)).length
    state.note = add ? `Added ${n} to ${g.name}.` : `Took ${n} out of ${g.name}.`
    picked.value = new Set()
    await load()
  } catch (e) {
    state.error = errMsg(e)
  } finally {
    state.busy = false
  }
}

// ---------- New group ----------
const newGroup = reactive({ name: '', error: '', busy: false })
async function addGroup() {
  newGroup.error = groupNameProblem(newGroup.name, groups.value) ?? ''
  if (newGroup.error) return
  newGroup.busy = true
  try {
    await createGroup(newGroup.name)
    newGroup.name = ''
  } catch (e) {
    newGroup.error = errMsg(e)
  } finally {
    newGroup.busy = false
  }
}

// ---------- Sheets ----------
const editing = ref<Person | null>(null)
const editOpen = computed({ get: () => editing.value !== null, set: (v) => { if (!v) editing.value = null } })
const adding = ref(false)
const managing = ref<Group | null>(null)
const manageOpen = computed({ get: () => managing.value !== null, set: (v) => { if (!v) managing.value = null } })
async function changed(note: string) {
  state.note = note
  editing.value = null
  adding.value = false
  managing.value = null
  await load()
}

// ---------- Spreadsheet ----------
function download() {
  csvDownload(`afriff-contacts-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['First name', 'Last name', 'Email', 'Groups', 'VIP', 'How they joined', 'Emails', 'Has the app'],
    ...shown.value.map((p) => [p.firstName, p.lastName, p.email, p.groups.map(groupName).filter(Boolean).join('; '), p.vip ? 'VIP' : '', SOURCE_LABEL[p.source], CONSENT_LABEL[p.consent], p.hasApp ? 'Yes' : 'No']),
  ])
}

const counts = computed(() => ({ all: people.value.length, emailable: people.value.filter((p) => p.canEmail).length, vip: people.value.filter((p) => p.vip).length }))
</script>

<template>
  <div>
    <h1 class="font-display text-h1 font-semibold">Contacts</h1>
    <p class="mt-1 text-muted">
      Everyone AFRIFF can invite. Every app sign-up is here by itself; add guests who won't sign up by hand. Only people who agreed to emails can be sent invitations.
      Admins and editors can see this page.
    </p>

    <div class="mt-4 flex flex-wrap gap-2">
      <UiButton size="sm" @click="adding = true"><UserPlusIcon /> Add a VIP by hand</UiButton>
      <UiButton size="sm" variant="secondary" :disabled="state.busy" @click="load"><RefreshCwIcon /> {{ state.busy ? 'Loading…' : 'Refresh' }}</UiButton>
      <UiButton size="sm" variant="secondary" :disabled="!shown.length" @click="download"><DownloadIcon /> Spreadsheet of these</UiButton>
    </div>
    <p v-if="state.error || watchError" class="mt-3 text-meta text-danger" role="alert">{{ state.error || watchError }}</p>
    <p v-if="state.note" class="mt-3 rounded-tile bg-accent-soft px-3 py-2 text-meta" role="status">{{ state.note }}</p>

    <div v-if="state.people" class="mt-4 grid grid-cols-3 gap-2">
      <div v-for="t in [[counts.all, 'contacts'], [counts.emailable, 'can be emailed'], [counts.vip, 'VIPs']]" :key="t[1]" class="card flex flex-col p-3">
        <span class="font-display text-h1 font-semibold tabular-nums">{{ t[0] }}</span>
        <span class="text-label text-muted">{{ t[1] }}</span>
      </div>
    </div>

    <!-- ---------- Groups ---------- -->
    <section class="mt-8">
      <h2 class="font-display text-h2 font-semibold">Groups</h2>
      <p class="mt-1 text-meta text-muted">e.g. "Gala VIPs", "Opening night", "Press". Someone can be in several. Tap a group to list its people.</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <UiChip :on="!f.group" @click="f.group = ''">Everyone</UiChip>
        <UiChip v-for="g in groups" :key="g.id" :on="f.group === g.id" @click="f.group = f.group === g.id ? '' : g.id">{{ g.name }} <span class="tabular-nums text-muted">{{ membersOf(g.id).length }}</span></UiChip>
        <UiChip :on="f.group === 'none'" @click="f.group = f.group === 'none' ? '' : 'none'">Not in a group</UiChip>
      </div>
      <div v-if="f.group && f.group !== 'none'" class="mt-3 flex flex-wrap gap-2">
        <UiButton size="sm" variant="secondary" @click="managing = groups.find((g) => g.id === f.group) ?? null">Rename or delete “{{ groupName(f.group) }}”</UiButton>
        <UiButton v-if="canOpen(auth.profile?.role, 'guests')" size="sm" variant="secondary" :to="`/admin/guests?group=${f.group}`"><PrinterIcon /> Guest list</UiButton>
      </div>
      <form class="mt-3 flex items-start gap-2" novalidate @submit.prevent="addGroup">
        <label class="flex flex-1 flex-col gap-1">
          <span class="sr-only">New group's name</span>
          <input v-model="newGroup.name" class="field-input" maxlength="60" placeholder="New group, e.g. Opening night" :aria-invalid="newGroup.error ? true : undefined" @input="newGroup.error = ''">
          <span v-if="newGroup.error" class="text-meta text-danger" role="alert">{{ newGroup.error }}</span>
        </label>
        <UiButton type="submit" variant="secondary" :loading="newGroup.busy">Add group</UiButton>
      </form>
    </section>

    <!-- ---------- VIP sign-up links (admins) ---------- -->
    <AdminVipLinks v-if="isAdmin" class="mt-8" :groups="groups" :links="links" :people="people" />

    <!-- ---------- The list ---------- -->
    <section class="mt-8">
      <h2 class="font-display text-h2 font-semibold">People</h2>
      <AdminSearch v-model="f.search" class="mt-3" label="Search by name or email" />
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <UiChip small :on="f.vip" @click="f.vip = !f.vip"><CrownIcon /> VIPs</UiChip>
        <UiChip small :on="f.email === 'yes'" @click="f.email = f.email === 'yes' ? '' : 'yes'">Can be emailed</UiChip>
        <UiChip small :on="f.email === 'no'" @click="f.email = f.email === 'no' ? '' : 'no'">Can't be emailed</UiChip>
        <select v-model="f.source" class="field-input h-8! w-auto! py-0! text-label" aria-label="How they joined">
          <option value="">Any way of joining</option>
          <option v-for="(label, s) in SOURCE_LABEL" :key="s" :value="s">{{ label }}</option>
        </select>
      </div>

      <!-- tick people, then add them to a group or take them out -->
      <div class="sticky top-14 z-10 mt-3 flex flex-wrap items-center gap-2 border-y border-line bg-canvas/95 py-2 backdrop-blur">
        <button type="button" class="pressable flex h-8 items-center gap-1.5 rounded-full px-2 text-label font-medium text-muted hover:text-ink" @click="pickAllShown">
          <ListChecksIcon class="size-4" /> {{ allShownPicked ? 'Untick all' : 'Tick all shown' }}
        </button>
        <span class="text-label text-muted tabular-nums">{{ picked.size }} ticked</span>
        <template v-if="picked.size">
          <select v-model="bulkGroup" class="field-input h-8! w-auto! py-0! text-label" aria-label="Group">
            <option value="">Choose a group…</option>
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
          <UiButton size="sm" :disabled="state.busy || !bulkGroup" @click="bulk(true)">Add to group</UiButton>
          <UiButton size="sm" variant="secondary" :disabled="state.busy || !bulkGroup" @click="bulk(false)">Take out</UiButton>
        </template>
      </div>

      <p v-if="state.people === null" class="mt-4 text-muted">{{ state.busy ? 'Loading…' : '' }}</p>
      <p v-else-if="!shown.length" class="mt-4 text-muted">{{ people.length ? 'Nobody matches.' : 'Nobody yet. People appear here when they sign up in the app.' }}</p>
      <ul class="divide-y divide-line">
        <li v-for="p in shown.slice(0, LIMIT)" :key="p.key" class="flex items-start gap-3 py-3">
          <input type="checkbox" class="mt-1 size-4 shrink-0 accent-accent" :checked="picked.has(p.key)" :aria-label="`Tick ${p.firstName} ${p.lastName}`" @change="toggle(p.key)">
          <button type="button" class="flex min-w-0 flex-1 flex-col gap-0.5 text-left" @click="editing = p">
            <span class="flex flex-wrap items-center gap-1.5">
              <span class="truncate font-semibold">{{ `${p.firstName} ${p.lastName}`.trim() || p.email }}</span>
              <UiBadge v-if="p.vip" tone="accent"><CrownIcon /> VIP</UiBadge>
              <UiBadge v-if="p.source !== 'app'" tone="neutral">{{ SOURCE_LABEL[p.source] }}</UiBadge>
            </span>
            <span class="truncate text-meta text-muted">{{ p.email }}</span>
            <span class="flex flex-wrap items-center gap-1.5 text-label">
              <UiBadge v-for="g in p.groups.filter(groupName)" :key="g" tone="info">{{ groupName(g) }}</UiBadge>
              <UiBadge :tone="p.canEmail ? 'success' : 'neutral'">{{ p.canEmail ? 'Can be emailed' : CONSENT_LABEL[p.consent] }}</UiBadge>
            </span>
          </button>
        </li>
      </ul>
      <p v-if="shown.length > LIMIT" class="mt-2 text-meta text-muted">Showing {{ LIMIT }} of {{ shown.length }}. Search or filter to find someone, or download the spreadsheet.</p>
    </section>

    <UiSheet v-model:open="editOpen" :title="editing ? `${editing.firstName} ${editing.lastName}`.trim() || editing.email : ''">
      <AdminContactSheet v-if="editing" :person="editing" :groups="groups" :people="people" :links="links" @done="changed" />
    </UiSheet>
    <UiSheet v-model:open="adding" title="Add a VIP by hand">
      <AdminAddVip v-if="adding" :groups="groups" :people="people" @done="changed" />
    </UiSheet>
    <UiSheet v-model:open="manageOpen" :title="managing ? managing.name : ''">
      <AdminGroupSheet v-if="managing" :group="managing" :groups="groups" :members="membersOf(managing.id)" :links="links" @done="changed" />
    </UiSheet>
  </div>
</template>
