<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ArrowLeftIcon } from 'lucide-vue-next'
import type { Person } from '#shared/contacts'
import { subjectOf } from '#shared/invites'
import { loadPeople, watchGroups, type Group } from '~/lib/contacts'
import {
  countGuests, editable, inviteSetup, lagosText, scheduledPushesRunning, sendInvite, shownStatus, watchInvite, watchScheduledPushes,
  type Count, type InviteDoc, type InviteSetup, type SendProgress,
} from '~/lib/invites'
import { useAdminAuth } from '~/lib/useAdminAuth'
import { errMsg } from '~/lib/util'

// One invitation: the form while it's a draft (or waiting for approval), then
// what happened to it (AdminInviteSent.vue). Sending lives here, so the
// progress stays on screen as the page switches from one to the other:
// count who gets it → "Send to 87 people?" → send (admins; the server checks).
const props = defineProps<{ id: string }>()
const auth = useAdminAuth()
const isAdmin = computed(() => auth.profile?.role === 'admin')

const invite = ref<InviteDoc | null | undefined>(undefined)
const loadError = ref('')
const people = ref<Person[] | null>(null)
const groups = ref<Group[]>([])
const setup = ref<InviteSetup | null | undefined>(undefined)
/** scheduled invites get push notifications too: the Cloud Function that sends them is running (admins) */
const pushCheckedAt = ref(0)
const scheduledPushes = computed(() => scheduledPushesRunning(pushCheckedAt.value))

const stops = [
  watchInvite(props.id, (c) => { invite.value = c }, (e) => { loadError.value = errMsg(e) }),
  watchGroups((g) => { groups.value = g }, (e) => { loadError.value = errMsg(e) }),
  ...(isAdmin.value ? [watchScheduledPushes((ms) => { pushCheckedAt.value = ms })] : []),
]
onBeforeUnmount(() => stops.forEach((s) => s()))
const reloadPeople = () => loadPeople().then((p) => { people.value = p }, (e) => { loadError.value = errMsg(e) })
onMounted(() => {
  void reloadPeople()
  inviteSetup().then((s) => { setup.value = s }, () => { setup.value = null })
})

useHead({ title: () => invite.value?.event.name || 'Invitation' })

// ---------- Sending ----------
type Mode = 'all' | 'new' | 'resend'
const confirm = reactive({ open: false, count: null as Count | null, mode: 'all' as Mode, scheduledAt: 0 })
const send = reactive({ busy: false, note: '', error: '' })
const progress = ref<SendProgress | null>(null)

/** Count who gets it, then ask "Send to N people?" (resends go without asking: they're fixed addresses). */
async function ask(mode: Mode, scheduledAt = 0) {
  Object.assign(send, { note: '', error: '' })
  if (mode === 'resend') return go({ mode })
  send.busy = true
  try {
    const count = await countGuests(props.id)
    if (mode === 'new' && !count.newPeople) {
      send.note = 'Nobody new: everyone who can get this invite already has it.'
      return
    }
    Object.assign(confirm, { open: true, count, mode, scheduledAt })
  } catch (e) {
    send.error = errMsg(e)
  } finally {
    send.busy = false
  }
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`

function finished(p: SendProgress) {
  const pushed = p.pushed ? ` ${plural(p.pushed, 'guest')} also got a push notification on their phone.` : ''
  if (p.status === 'scheduled') {
    send.note = `Scheduled: Brevo sends it at ${lagosText(p.scheduledAt)} (Lagos time) to ${plural(p.sent, 'person', 'people')}. ${scheduledPushes.value
      ? 'Guests who use the AFRIFF app (logged in, alerts on) get a push notification within a minute of it going out.'
      : 'By email only for now: the Cloud Function that sends push notifications for scheduled invitations isn\'t running (see the Invitations page).'}`
  }
  else if (p.status === 'sent') send.note = `Sent to ${plural(p.sent, 'person', 'people')}${p.failed ? `; ${plural(p.failed, 'address', 'addresses')} turned down (listed below)` : ''}.${pushed}`
  else if (p.status === 'paused') send.error = `Paused after ${plural(p.sent, 'email')}. ${p.error}`
  else send.note = `Sent ${plural(p.sent, 'email')} so far. Press Continue sending to carry on.`
}

async function go(how: { mode: Mode; scheduledAt?: number } | 'continue') {
  Object.assign(send, { busy: true, note: '', error: '' })
  progress.value = null
  try {
    finished(await sendInvite(props.id, how, (p) => { progress.value = p }))
    if (how !== 'continue' && how.mode === 'new') void reloadPeople()
  } catch (e) {
    send.error = errMsg(e)
  } finally {
    Object.assign(send, { busy: false })
    confirm.open = false
    progress.value = null
  }
}

const status = computed(() => (invite.value ? shownStatus(invite.value) : 'draft'))
</script>

<template>
  <div>
    <UiButton size="sm" variant="ghost" to="/admin/invites" class="-ml-2 mb-2"><ArrowLeftIcon /> All invitations</UiButton>
    <p v-if="loadError" class="text-meta text-danger" role="alert">{{ loadError }}</p>
    <p v-if="invite === undefined" class="text-muted">Loading…</p>
    <template v-else-if="invite === null">
      <h1 class="font-display text-h1 font-semibold">Not found</h1>
      <p class="mt-1 text-muted">This invitation isn't in the list any more (a draft may have been deleted).</p>
    </template>
    <template v-else>
      <p v-if="send.error" class="mb-3 text-meta text-danger" role="alert">{{ send.error }}</p>
      <p v-if="send.note" class="mb-3 rounded-tile bg-accent-soft px-3 py-2 text-meta" role="status">{{ send.note }}</p>
      <p v-if="progress" class="mb-3 rounded-tile bg-raised px-3 py-2 text-meta" role="status">
        {{ progress.scheduledAt > Date.now() ? 'Handing it to Brevo…' : 'Sending…' }} {{ progress.sent.toLocaleString('en-GB') }} of {{ progress.total.toLocaleString('en-GB') }}. Keep this page open.
      </p>

      <AdminInviteForm
        v-if="editable(invite)"
        :key="invite.id"
        :invite="invite"
        :people="people"
        :groups="groups"
        :setup="setup"
        :busy="send.busy"
        @send="(at) => ask('all', at)"
      />
      <AdminInviteSent
        v-else
        :invite="invite"
        :status="status"
        :busy="send.busy"
        @send="(mode) => ask(mode)"
        @continue="go('continue')"
      />
    </template>

    <UiSheet v-model:open="confirm.open" :title="isAdmin ? 'Check before sending' : ''">
      <AdminInviteConfirm
        v-if="confirm.count && invite"
        :count="confirm.count"
        :mode="confirm.mode"
        :subject="subjectOf(invite)"
        :when="confirm.scheduledAt ? lagosText(confirm.scheduledAt) : ''"
        :busy="send.busy"
        :scheduled-pushes="scheduledPushes"
        @send="go({ mode: confirm.mode, scheduledAt: confirm.scheduledAt || undefined })"
        @cancel="confirm.open = false"
      />
    </UiSheet>
  </div>
</template>
