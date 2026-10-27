<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { BarChart3Icon, PlusIcon } from 'lucide-vue-next'
import {
  createInvite, inviteSetup, lagosText, loadStats, shownStatus, watchInvites,
  type InviteDoc, type InviteSetup, type InviteStatus, type Stats,
} from '~/lib/invites'
import { matchesSearch, searchWords } from '~/lib/search'
import { useAdminAuth } from '~/lib/useAdminAuth'
import { errMsg, whenLagos } from '~/lib/util'

// Admins and editors: every invitation, newest first (the invite log). Editors
// prepare and test; only admins send (AdminInvite.vue, checked on the server).
// Invitations go by email only, never inside the app.
const auth = useAdminAuth()
const isAdmin = computed(() => auth.profile?.role === 'admin')
const router = useRouter()

const setup = ref<InviteSetup | null | undefined>(undefined)
const setupError = ref('')
onMounted(() => inviteSetup().then((s) => { setup.value = s }, (e) => { setup.value = null; setupError.value = errMsg(e) }))

const list = ref<InviteDoc[] | null>(null)
const listError = ref('')
const stop = watchInvites((l) => { list.value = l }, (e) => { listError.value = errMsg(e) })
onBeforeUnmount(stop)

const creating = reactive({ busy: false, error: '' })
async function create() {
  Object.assign(creating, { busy: true, error: '' })
  try {
    await router.push(`/admin/invites/${await createInvite()}`)
  } catch (e) {
    creating.error = errMsg(e)
  } finally {
    creating.busy = false
  }
}

// Brevo's delivery numbers, on request (a few calls to Brevo per invite)
const stats = reactive<Record<string, Stats | 'error'>>({})
const statsBusy = ref(false)
async function loadDelivery() {
  statsBusy.value = true
  for (const c of list.value ?? []) {
    if (shownStatus(c) !== 'sent') continue
    stats[c.id] = await loadStats(c.id).catch(() => 'error' as const)
  }
  statsBusy.value = false
}
const delivery = (id: string) => {
  const s = stats[id]
  if (!s) return ''
  if (s === 'error') return 'Couldn’t load Brevo’s numbers'
  const b = s.stats
  return b ? `${b.delivered} delivered · ${b.uniqueOpens} opened · ${b.hardBounces + b.softBounces + b.blocked + b.invalid} bounced` : ''
}

const STATUS: Record<InviteStatus, { label: string; tone: 'success' | 'accent' | 'danger' | 'info' | 'neutral' }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  review: { label: 'Waiting for approval', tone: 'accent' },
  sending: { label: 'Sending', tone: 'accent' },
  paused: { label: 'Paused', tone: 'danger' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  sent: { label: 'Sent', tone: 'success' },
}
const waiting = computed(() => (list.value ?? []).filter((c) => c.status === 'review').length)

// Search: the event, its groups, who started it, its status ("draft", "sent")
const q = ref('')
const shown = computed(() => {
  const words = searchWords(q.value)
  return (list.value ?? []).filter((c) => matchesSearch(words, c.event.name || 'Untitled', c.event.venue, c.groupNames, c.createdByName, STATUS[shownStatus(c)].label, c.parentId && 'Update'))
})
</script>

<template>
  <div>
    <h1 class="font-display text-h1 font-semibold">Invitations</h1>
    <p class="mt-1 text-muted">
      Invitations by email to groups of contacts, e.g. opening and closing night, in AFRIFF's invitation design. {{ isAdmin ? 'Editors prepare them; you approve and send.' : 'You prepare and test them; an admin approves and sends.' }}
      Guests are picked on the <NuxtLink to="/admin/contacts" class="text-accent-ink underline">Contacts</NuxtLink> page.
    </p>

    <section class="card mt-5 flex flex-col gap-2 p-4 text-meta">
      <p v-if="setup === undefined" class="text-muted">Checking the server…</p>
      <p v-else-if="setup === null" class="text-danger" role="alert">Couldn't check the server: {{ setupError }}</p>
      <p v-else class="flex items-start gap-2">
        <UiBadge :tone="setup.ready ? 'success' : 'danger'">{{ setup.ready ? 'Ready' : 'Off' }}</UiBadge>
        <span v-if="setup.ready"><strong class="font-semibold">Sending from {{ setup.from }}</strong> through Brevo.</span>
        <span v-else><strong class="font-semibold">Sending isn't set up yet.</strong> The staff app still needs: {{ setup.missing.join('; ') }}.</span>
      </p>
      <p class="text-label text-muted">Test every invite with a small test group (3 people) before a real send. Brevo's free plan sends about 300 emails a day.</p>
    </section>

    <div class="mt-5 flex flex-wrap items-center gap-2">
      <UiButton :loading="creating.busy" @click="create"><PlusIcon /> New invitation</UiButton>
      <UiButton variant="secondary" :disabled="statsBusy || !list?.some((c) => shownStatus(c) === 'sent')" @click="loadDelivery"><BarChart3Icon /> {{ statsBusy ? 'Asking Brevo…' : 'Delivery numbers' }}</UiButton>
      <UiBadge v-if="isAdmin && waiting" tone="accent" class="self-center!">{{ waiting }} waiting for you</UiBadge>
    </div>
    <p v-if="creating.error" class="mt-2 text-meta text-danger" role="alert">{{ creating.error }}</p>

    <p v-if="listError" class="mt-4 text-meta text-danger" role="alert">{{ listError }}</p>
    <p v-else-if="list === null" class="mt-4 text-muted">Loading…</p>
    <p v-else-if="!list.length" class="mt-4 text-muted">No invitations yet.</p>
    <template v-else>
      <AdminSearch v-model="q" class="mt-4" label="Search by event, group or status" />
      <p v-if="!shown.length" class="mt-3 text-muted">No invitation matches “{{ q.trim() }}”.</p>
    </template>
    <ul class="mt-3 divide-y divide-line">
      <li v-for="c in shown" :key="c.id">
        <NuxtLink :to="`/admin/invites/${c.id}`" class="flex flex-col gap-1 py-3 hover:bg-hover/40">
          <span class="flex flex-wrap items-center gap-2">
            <span class="min-w-0 flex-1 truncate font-semibold">{{ c.event.name || 'Untitled' }}</span>
            <UiBadge v-if="c.parentId" tone="info">Update</UiBadge>
            <UiBadge :tone="STATUS[shownStatus(c)].tone">{{ STATUS[shownStatus(c)].label }}</UiBadge>
          </span>
          <span class="text-meta text-muted">
            <template v-if="c.status === 'draft' || c.status === 'review'">Started {{ whenLagos(c.createdAt) }} by {{ c.createdByName || 'someone' }}</template>
            <template v-else>{{ c.status === 'scheduled' && c.scheduledAt > Date.now() ? 'Goes out' : 'Sent' }} {{ lagosText(c.scheduledAt || c.sentAt) }} · {{ c.sent }} {{ c.sent === 1 ? 'person' : 'people' }}{{ c.unsubscribed ? ` · ${c.unsubscribed} unsubscribed` : '' }}</template>
            <template v-if="c.groupNames.length"> · {{ c.groupNames.join(', ') }}</template>
          </span>
          <span v-if="delivery(c.id)" class="text-label text-muted">{{ delivery(c.id) }}</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
