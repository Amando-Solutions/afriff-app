<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeftIcon, DownloadIcon, PrinterIcon } from 'lucide-vue-next'
import { byName } from '#shared/contacts'
import { loadPeople, watchGroups, type Group } from '~/lib/contacts'
import { lagosText, loadGuests, watchInvite, type InviteDoc } from '~/lib/invites'
import { csvDownload } from '~/lib/reports'
import { errMsg } from '~/lib/util'

// Admins only (lib/access.ts; firestore.rules agree): the door team's list for
// opening night. Per invite (who it went to) or per group (everyone in it,
// emailed or not). A–Z by last name, with an empty "Arrived" box to tick on
// paper. Prints on white (the console's colours are hidden on paper).
const route = useRoute()
const inviteId = computed(() => (typeof route.query.invite === 'string' ? route.query.invite : ''))
const groupId = computed(() => (typeof route.query.group === 'string' ? route.query.group : ''))

interface Row { lastName: string; firstName: string; email: string; groups: string[]; vip: boolean; key: string }
const rows = ref<Row[] | null>(null)
const error = ref('')
const invite = ref<InviteDoc | null>(null)
const groups = ref<Group[]>([])
const stops: (() => void)[] = []

onMounted(async () => {
  try {
    if (inviteId.value) {
      stops.push(watchInvite(inviteId.value, (c) => { invite.value = c }, (e) => { error.value = errMsg(e) }))
      const guests = await loadGuests(inviteId.value)
      rows.value = guests.filter((g) => g.status !== 'failed').map((g) => ({ ...g })).sort(byName)
    } else if (groupId.value) {
      stops.push(watchGroups((g) => { groups.value = g }, (e) => { error.value = errMsg(e) }))
      const people = await loadPeople()
      rows.value = people.filter((p) => p.groups.includes(groupId.value)).map((p) => ({ ...p })).sort(byName)
    } else {
      error.value = 'Open this from an invite or a group.'
    }
  } catch (e) {
    error.value = errMsg(e)
  }
})
onBeforeUnmount(() => stops.forEach((s) => s()))

const groupName = (id: string) => groups.value.find((g) => g.id === id)?.name ?? ''
/** each row's groups as words: an invite's rows carry names, a group's carry ids */
const groupsOf = (r: Row) => (inviteId.value ? r.groups : r.groups.map(groupName).filter(Boolean)).join(', ')
const title = computed(() => inviteId.value
  ? invite.value?.event.name || 'Guest list'
  : groupName(groupId.value) || 'Guest list')
const subtitle = computed(() => {
  const c = invite.value
  if (inviteId.value && c) return [c.event.date && new Date(`${c.event.date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), c.event.time, c.event.venue].filter(Boolean).join(' · ')
  return groupId.value ? 'Everyone in this group, whether or not they were emailed' : ''
})
useHead({ title: () => `${title.value} · Guest list` })

const print = () => window.print()

function download() {
  csvDownload(`afriff-guest-list-${title.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, [
    ['Last name', 'First name', 'Group', 'VIP', 'Email'],
    ...(rows.value ?? []).map((r) => [r.lastName, r.firstName, groupsOf(r), r.vip ? 'VIP' : '', r.email]),
  ])
}
</script>

<template>
  <div class="guest-list">
    <div class="no-print mb-4 flex flex-wrap items-center gap-2">
      <UiButton size="sm" variant="ghost" :to="inviteId ? `/admin/invites/${inviteId}` : '/admin/contacts'"><ArrowLeftIcon /> Back</UiButton>
      <UiButton size="sm" :disabled="!rows?.length" @click="print"><PrinterIcon /> Print</UiButton>
      <UiButton size="sm" variant="secondary" :disabled="!rows?.length" @click="download"><DownloadIcon /> Spreadsheet</UiButton>
    </div>

    <h1 class="font-display text-h1 font-semibold">{{ title }}</h1>
    <p class="mt-1 text-muted">
      Guest list<template v-if="subtitle"> · {{ subtitle }}</template>
      <template v-if="rows"> · {{ rows.length }} {{ rows.length === 1 ? 'guest' : 'guests' }}</template>
    </p>
    <p v-if="invite?.scheduledAt && invite.status === 'scheduled'" class="no-print mt-1 text-meta text-muted">Scheduled to go at {{ lagosText(invite.scheduledAt) }}.</p>
    <p v-if="error" class="mt-3 text-meta text-danger" role="alert">{{ error }}</p>
    <p v-else-if="rows === null" class="mt-3 text-muted">Loading…</p>
    <p v-else-if="!rows.length" class="mt-3 text-muted">Nobody on this list yet.</p>

    <table v-if="rows?.length" class="mt-4 w-full border-collapse text-left text-meta">
      <thead>
        <tr class="border-b border-line-strong text-label text-muted">
          <th class="w-10 py-2 pr-2 font-medium">#</th>
          <th class="py-2 pr-2 font-medium">Last name</th>
          <th class="py-2 pr-2 font-medium">First name</th>
          <th class="py-2 pr-2 font-medium">Group</th>
          <th class="w-12 py-2 pr-2 font-medium">VIP</th>
          <th class="w-16 py-2 font-medium">Arrived</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in rows" :key="r.key" class="border-b border-line align-top">
          <td class="py-2 pr-2 text-muted tabular-nums">{{ i + 1 }}</td>
          <td class="py-2 pr-2 font-semibold">{{ r.lastName || '—' }}</td>
          <td class="py-2 pr-2">{{ r.firstName || r.email }}</td>
          <td class="py-2 pr-2">{{ groupsOf(r) }}</td>
          <td class="py-2 pr-2">{{ r.vip ? 'VIP' : '' }}</td>
          <td class="py-2"><span class="inline-block size-4 rounded-sm border border-line-strong" aria-label="Arrived (tick on paper)" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style>
/* on paper: black on white, no console bar, no buttons */
@media print {
  html, body { background: #fff !important; color: #000 !important; }
  body header, .no-print { display: none !important; }
  .guest-list, .guest-list * { color: #000 !important; border-color: #999 !important; }
  .guest-list table { font-size: 11pt; }
  .guest-list tr { break-inside: avoid; }
}
</style>
