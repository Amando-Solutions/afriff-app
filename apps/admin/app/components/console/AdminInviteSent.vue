<script setup lang="ts">
import { confirmAction } from '~/lib/confirm'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { MailPlusIcon, PlayIcon, PrinterIcon, RefreshCwIcon, RotateCwIcon, UserPlusIcon, XCircleIcon } from 'lucide-vue-next'
import { cleanInvite, subjectOf } from '#shared/invites'
import { canOpen } from '~/lib/access'
import {
  cancelSchedule, createInvite, fixAddress, lagosText, loadStats,
  type InviteDoc, type InviteStatus, type Stats,
} from '~/lib/invites'
import { useAdminAuth } from '~/lib/useAdminAuth'
import { errMsg } from '~/lib/util'

// An invitation that has gone out (or is going, or is scheduled): the log
// (sent, delivered, opened, bounced, unsubscribed), the addresses that didn't
// take it (admins fix them and resend to just those), "Send to new people
// only", the update email, and the guest list. Sending itself: AdminInvite.vue.
const props = defineProps<{ invite: InviteDoc; status: InviteStatus; busy: boolean }>()
const emit = defineEmits<{ send: [mode: 'new' | 'resend']; continue: [] }>()
const auth = useAdminAuth()
const isAdmin = computed(() => auth.profile?.role === 'admin')
const router = useRouter()

const c = computed(() => props.invite)
const now = ref(Date.now())
const clock = setInterval(() => { now.value = Date.now() }, 15_000)
onBeforeUnmount(() => clearInterval(clock))
const beingSent = computed(() => c.value.status === 'sending' && c.value.lockUntil > now.value)
const canContinue = computed(() => isAdmin.value && !props.busy && (c.value.status === 'paused' || (c.value.status === 'sending' && c.value.lockUntil <= now.value)))
const scheduledLater = computed(() => c.value.status === 'scheduled' && c.value.scheduledAt > now.value)

// ---------- Brevo's numbers ----------
const stats = ref<Stats | null>(null)
const statsState = reactive({ busy: false, error: '' })
async function refresh() {
  if (c.value.status === 'draft' || c.value.status === 'review') return
  Object.assign(statsState, { busy: true, error: '' })
  try {
    stats.value = await loadStats(c.value.id)
  } catch (e) {
    statsState.error = errMsg(e)
  } finally {
    statsState.busy = false
  }
}
onMounted(refresh)

const tiles = computed(() => {
  const s = stats.value?.stats
  return [
    { label: 'sent', value: c.value.sent },
    { label: 'got a push', value: c.value.pushed },
    { label: 'delivered', value: s?.delivered },
    { label: 'opened', value: s?.uniqueOpens },
    { label: 'bounced', value: s ? s.hardBounces + s.softBounces + s.blocked + s.invalid : undefined },
    { label: 'unsubscribed', value: stats.value?.unsubscribed ?? c.value.unsubscribed },
  ]
})
const KIND = { hardBounces: 'Bounced', softBounces: 'Bounced (temporary)', blocked: 'Blocked', invalid: 'Not a real address' } as const

// ---------- Fixing bounced addresses (admins) ----------
const fixing = reactive<Record<string, string>>({})
const fixState = reactive({ busy: '', error: '', note: '' })
async function saveFix(key: string) {
  Object.assign(fixState, { busy: key, error: '', note: '' })
  try {
    const r = await fixAddress(c.value.id, key, fixing[key] ?? '')
    delete fixing[key]
    fixState.note = r.contactUpdated ? 'Saved, on the invite and on their contact (for later invites).' : 'Saved for this invite. They signed up in the app with the old address, so their account keeps it.'
    await refresh()
  } catch (e) {
    fixState.error = errMsg(e)
  } finally {
    fixState.busy = ''
  }
}

// ---------- Calling off a scheduled one (admins) ----------
const cancelState = reactive({ busy: false, error: '' })
async function cancel() {
  const ok = await confirmAction({
    title: 'Call off this invite?',
    message: `Brevo won't send it at ${lagosText(c.value.scheduledAt)} (Lagos time), and it goes back to waiting for approval.`,
    confirmLabel: 'Call it off',
    cancelLabel: 'Keep it scheduled',
    tone: 'danger',
  })
  if (!ok) return
  Object.assign(cancelState, { busy: true, error: '' })
  try {
    await cancelSchedule(c.value.id)
  } catch (e) {
    cancelState.error = errMsg(e)
  } finally {
    cancelState.busy = false
  }
}

// ---------- An update to the same people ----------
const updateState = reactive({ busy: false, error: '' })
async function update() {
  Object.assign(updateState, { busy: true, error: '' })
  try {
    await router.push(`/admin/invites/${await createInvite(c.value)}`)
  } catch (e) {
    updateState.error = errMsg(e)
  } finally {
    updateState.busy = false
  }
}

// ---------- What it looked like ----------
const showPreview = ref(false)

const STATUS: Record<InviteStatus, { label: string; tone: 'success' | 'accent' | 'danger' | 'info' | 'neutral' }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  review: { label: 'Waiting for approval', tone: 'accent' },
  sending: { label: 'Sending', tone: 'accent' },
  paused: { label: 'Paused', tone: 'danger' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  sent: { label: 'Sent', tone: 'success' },
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="font-display text-h1 font-semibold">{{ c.event.name || c.subject }}</h1>
      <UiBadge v-if="c.parentId" tone="info">Update</UiBadge>
      <UiBadge :tone="STATUS[status].tone">{{ STATUS[status].label }}</UiBadge>
    </div>
    <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-meta">
      <dt class="text-muted">{{ scheduledLater ? 'Goes out' : 'Sent' }}</dt>
      <dd>{{ lagosText(c.scheduledAt || c.sentAt) }}{{ c.sentByName ? ` · by ${c.sentByName}` : '' }}{{ c.createdByName && c.createdByName !== c.sentByName ? ` · prepared by ${c.createdByName}` : '' }}</dd>
      <dt class="text-muted">Subject</dt><dd>{{ subjectOf(c) }}</dd>
      <dt class="text-muted">To</dt><dd>{{ c.parentId ? 'The people the invitation went to' : c.groupNames.join(', ') || 'People picked one by one' }}</dd>
    </dl>

    <!-- ---------- Still going? ---------- -->
    <div v-if="c.status === 'paused' || c.status === 'sending' || scheduledLater" class="card mt-4 flex flex-col gap-2 p-3 text-meta">
      <p v-if="c.status === 'paused'" class="text-danger" role="alert">{{ c.error }}</p>
      <p v-else-if="beingSent">Being sent right now… {{ c.sent }} of {{ c.total }}.</p>
      <p v-else-if="c.status === 'sending'">Stopped half-way ({{ c.sent }} of {{ c.total }}): the page that was sending it closed.</p>
      <p v-if="scheduledLater">Brevo sends it at <strong>{{ lagosText(c.scheduledAt) }}</strong> (Lagos time) to {{ c.sent }} {{ c.sent === 1 ? 'person' : 'people' }}.</p>
      <div class="flex flex-wrap gap-2">
        <UiButton v-if="canContinue" size="sm" @click="emit('continue')"><PlayIcon /> Continue sending</UiButton>
        <UiButton v-if="isAdmin && scheduledLater && c.status === 'scheduled'" size="sm" variant="danger" :loading="cancelState.busy" @click="cancel"><XCircleIcon /> Call it off</UiButton>
      </div>
      <p v-if="cancelState.error" class="text-danger" role="alert">{{ cancelState.error }}</p>
      <p v-if="!isAdmin && (c.status === 'paused' || canContinue)" class="text-muted">An admin can continue sending it.</p>
    </div>

    <!-- ---------- The log ---------- -->
    <section class="mt-6">
      <div class="flex items-center gap-2">
        <h2 class="font-display text-h2 font-semibold">How it went</h2>
        <button type="button" class="pressable ml-auto grid size-8 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink" aria-label="Refresh the numbers" :disabled="statsState.busy" @click="refresh">
          <RefreshCwIcon class="size-4" :class="statsState.busy && 'animate-spin'" />
        </button>
      </div>
      <div class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        <div v-for="t in tiles" :key="t.label" class="card flex flex-col p-3">
          <span class="font-display text-h1 font-semibold tabular-nums">{{ t.value ?? '–' }}</span>
          <span class="text-label text-muted">{{ t.label }}</span>
        </div>
      </div>
      <p class="mt-2 text-label text-muted">
        From Brevo, which can take a few minutes to catch up ("got a push" is ours: guests logged in to the AFRIFF app with alerts on). "Opened" is a rough guide: some email apps (Apple Mail) open every email by themselves, others block the counting.
        {{ c.failed ? `${c.failed} turned down by Brevo when sending.` : '' }}
      </p>
      <p v-if="statsState.error" class="mt-2 text-meta text-danger" role="alert">{{ statsState.error }}</p>

      <!-- addresses that didn't take it -->
      <div v-if="stats?.problems.length || c.failures.length" class="mt-4 flex flex-col gap-2">
        <h3 class="font-semibold">Didn't arrive</h3>
        <p class="text-meta text-muted">{{ isAdmin ? 'Fix an address, then resend to just those.' : 'An admin can fix these and resend.' }}</p>
        <ul class="divide-y divide-line">
          <li v-for="p in stats?.problems ?? []" :key="p.email" class="flex flex-col gap-1.5 py-2.5 text-meta">
            <span class="flex flex-wrap items-center gap-2">
              <span class="font-medium">{{ p.name || p.email }}</span>
              <span class="text-muted">{{ p.email }}</span>
              <UiBadge tone="danger">{{ KIND[p.kind] }}</UiBadge>
            </span>
            <span v-if="p.reason" class="text-label text-muted">{{ p.reason }}</span>
            <span v-if="p.fixedTo" class="text-label">Fixed: {{ p.fixedTo }}{{ p.queued ? ' (waiting to resend)' : ' (sent again)' }}</span>
            <form v-else-if="isAdmin && p.key" class="flex gap-2" novalidate @submit.prevent="saveFix(p.key)">
              <input v-model="fixing[p.key]" type="email" class="field-input h-9! flex-1" :placeholder="`Right address for ${p.name || 'them'}`" autocapitalize="off" spellcheck="false" maxlength="254" :aria-label="`Right address for ${p.name || p.email}`">
              <UiButton type="submit" size="sm" variant="secondary" :loading="fixState.busy === p.key" :disabled="!fixing[p.key]">Fix</UiButton>
            </form>
          </li>
          <li v-for="f in c.failures" :key="`f-${f.email}`" class="flex flex-col gap-0.5 py-2.5 text-meta">
            <span class="flex items-center gap-2"><span class="font-medium">{{ f.email }}</span><UiBadge tone="danger">Turned down by Brevo</UiBadge></span>
            <span class="text-label text-muted">{{ f.reason }}</span>
          </li>
        </ul>
        <p v-if="fixState.error" class="text-meta text-danger" role="alert">{{ fixState.error }}</p>
        <p v-if="fixState.note" class="text-meta" role="status">{{ fixState.note }}</p>
        <UiButton v-if="isAdmin && stats?.queued" class="self-start" :disabled="busy || status !== 'sent'" @click="emit('send', 'resend')">
          <RotateCwIcon /> Resend to fixed addresses ({{ stats.queued }})
        </UiButton>
      </div>
    </section>

    <!-- ---------- What next ---------- -->
    <section class="mt-8 flex flex-col gap-2 border-t border-line pt-6">
      <div class="flex flex-wrap gap-2">
        <UiButton v-if="isAdmin && !c.parentId" variant="secondary" :disabled="busy || (status !== 'sent' && status !== 'scheduled')" @click="emit('send', 'new')"><UserPlusIcon /> Send to new people only…</UiButton>
        <UiButton v-if="!c.parentId" variant="secondary" :loading="updateState.busy" :disabled="status === 'sending' || status === 'paused'" @click="update"><MailPlusIcon /> Send an update…</UiButton>
        <UiButton v-if="canOpen(auth.profile?.role, 'guests')" variant="secondary" :to="`/admin/guests?invite=${c.id}`"><PrinterIcon /> Guest list</UiButton>
      </div>
      <p class="text-label text-muted">
        <template v-if="!c.parentId">New people only: anyone added to its groups since (who can be emailed) gets it; nobody gets it twice. An update: a short change-of-plan email to the same people, approved the same way.</template>
      </p>
      <p v-if="updateState.error" class="text-meta text-danger" role="alert">{{ updateState.error }}</p>
    </section>

    <section class="mt-6">
      <UiButton size="sm" variant="ghost" class="-ml-2" @click="showPreview = !showPreview">{{ showPreview ? 'Hide' : 'Show' }} what it looked like</UiButton>
      <AdminInvitePreview v-if="showPreview" class="mt-2" :content="cleanInvite(c)" :invite-id="c.id" :guest="{ firstName: 'Ada', lastName: 'Obi' }" />
    </section>
  </div>
</template>
