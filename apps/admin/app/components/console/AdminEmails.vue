<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { CopyIcon, MailCheckIcon, PlayIcon, RefreshCwIcon, SendIcon } from 'lucide-vue-next'
import { useFormChecks } from '@afriff/core/utils/formChecks'
import { EMAIL_LIMITS, EMPTY_DRAFT, cleanDraft, draftProblems, renderEmail, type EmailDraft } from '#shared/festivalEmail'
import type { FieldDef } from '~/lib/schema'
import { countSubscribers, emailSetup, sendAll, sendTest, watchEmails, type EmailSetup, type SendProgress, type SentEmail } from '~/lib/emails'
import { useAdminAuth } from '~/lib/useAdminAuth'
import { errMsg, whenLagos } from '~/lib/util'

// Admins only (lib/access.ts; firestore.rules agree): write an email and send
// it to everyone who said yes to festival emails in the app. The staff app's
// server sends it through Brevo (server/emails/*); each email starts with
// "Hi <first name>," and ends with that person's unsubscribe link.
const auth = useAdminAuth()
const appUrl = useRuntimeConfig().public.attendeeUrl as string

const FIELDS: FieldDef[] = [
  { key: 'subject', label: 'Subject', type: 'text', required: true, max: EMAIL_LIMITS.subject, hint: 'What people see in their inbox, e.g. "Masterclass registration is open".' },
  { key: 'message', label: 'Message', type: 'textarea', required: true, max: EMAIL_LIMITS.message, hint: 'Plain text. Leave a blank line to start a new paragraph. Links starting with https:// become clickable.' },
  { key: 'buttonLabel', label: 'Button text', type: 'text', max: EMAIL_LIMITS.buttonLabel, hint: 'Optional: a gold button under the message, e.g. "Register on afriff.com".' },
  { key: 'buttonUrl', label: 'Button link', type: 'url', hint: 'The page the button opens, starting with https://' },
]
type Key = keyof EmailDraft

// What's being written stays on this computer until it's sent (a reload doesn't lose it).
const draft = useLocalStorage<EmailDraft>('afriff-email-draft', { ...EMPTY_DRAFT }, { mergeDefaults: true })

const checks = useFormChecks(
  () => Object.fromEntries(FIELDS.map((f) => [f.key, () => draftProblems(draft.value)[f.key as Key] ?? null])),
  (key) => draft.value[key as Key],
)
watch(draft, checks.recheck, { deep: true })

// ---------- Can it send, and to how many ----------
const setup = ref<EmailSetup | null | undefined>(undefined)
const setupError = ref('')
const audience = ref<number | null>(null)
const audienceError = ref('')

async function loadAudience() {
  audienceError.value = ''
  try {
    audience.value = await countSubscribers()
  } catch (e) {
    audienceError.value = errMsg(e)
  }
}

onMounted(async () => {
  await Promise.all([
    emailSetup().then((s) => { setup.value = s }, (e) => { setup.value = null; setupError.value = errMsg(e) }),
    loadAudience(),
  ])
})

// ---------- The preview: exactly what's sent ----------
const firstName = computed(() => (auth.profile?.name || '').trim().split(/\s+/)[0] || 'Ada')
const hasText = computed(() => Boolean(draft.value.subject.trim() || draft.value.message.trim()))
const previewHtml = computed(() => renderEmail(draft.value, { firstName: firstName.value, unsubscribeUrl: appUrl, appUrl }))
const frame = ref<HTMLIFrameElement | null>(null)
const frameHeight = ref(480)
function fitFrame() {
  const h = frame.value?.contentDocument?.documentElement.scrollHeight
  if (h) frameHeight.value = h
}

// ---------- Sending ----------
const state = reactive({ busy: '' as '' | 'test' | 'send', note: '', error: '' })
const progress = ref<SendProgress | null>(null)
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`

async function test() {
  Object.assign(state, { note: '', error: '' })
  if (!checks.checkAll()) return
  state.busy = 'test'
  try {
    const r = await sendTest(cleanDraft(draft.value))
    state.note = `Test sent to ${r.to}. Check your inbox (and the spam folder) in a minute.`
  } catch (e) {
    state.error = errMsg(e)
  } finally {
    state.busy = ''
  }
}

function finished(p: SendProgress) {
  if (p.status === 'sent') state.note = `Sent to ${plural(p.sent, 'person', 'people')}${p.failed ? `; ${plural(p.failed, 'address', 'addresses')} turned down (listed below)` : ''}.`
  else if (p.status === 'paused') state.error = `Paused after ${plural(p.sent, 'email')}. ${p.error}`
  else state.note = `Sent ${plural(p.sent, 'email')} so far. Press Continue sending below to carry on.`
}

async function sendToAll() {
  Object.assign(state, { note: '', error: '' })
  if (!checks.checkAll()) return
  const d = cleanDraft(draft.value)
  const n = audience.value
  if (!window.confirm(`Send "${d.subject}" to ${n == null ? 'everyone who said yes to festival emails' : plural(n, 'person', 'people')} now?\n\nOnce it's sent it can't be called back. Sent yourself a test first?`)) return
  state.busy = 'send'
  progress.value = null
  try {
    const p = await sendAll({ draft: d }, (p) => {
      // it's recorded on the server now: the form is free for the next one
      if (!progress.value) { draft.value = { ...EMPTY_DRAFT }; checks.clear() }
      progress.value = p
    })
    finished(p)
  } catch (e) {
    state.error = errMsg(e)
  } finally {
    state.busy = ''
    progress.value = null
  }
}

// ---------- Emails sent before ----------
const list = ref<SentEmail[] | null>(null)
const listError = ref('')
const stopWatching = watchEmails((l) => { list.value = l }, (e) => { listError.value = errMsg(e) })
onBeforeUnmount(stopWatching)

// ticks so "being sent right now" turns into "Continue sending" when a sender stops
const now = ref(Date.now())
const clock = setInterval(() => { now.value = Date.now() }, 15_000)
onBeforeUnmount(() => clearInterval(clock))

const canContinue = (e: SentEmail) => e.status !== 'sent' && e.lockUntil <= now.value && !state.busy
const continuing = ref('')

async function carryOn(e: SentEmail) {
  Object.assign(state, { note: '', error: '' })
  state.busy = 'send'
  continuing.value = e.id
  try {
    finished(await sendAll({ id: e.id }, (p) => { progress.value = p }))
  } catch (err) {
    state.error = errMsg(err)
  } finally {
    state.busy = ''
    continuing.value = ''
    progress.value = null
  }
}

function copyIntoForm(e: SentEmail) {
  draft.value = { subject: e.subject, message: e.message, buttonLabel: e.buttonLabel, buttonUrl: e.buttonUrl }
  checks.clear()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const STATUS = {
  sent: { label: 'Sent', tone: 'success' },
  sending: { label: 'Sending', tone: 'accent' },
  paused: { label: 'Paused', tone: 'danger' },
} as const
</script>

<template>
  <div>
    <h1 class="font-display text-h1 font-semibold">Festival emails</h1>
    <p class="mt-1 text-muted">Write an email here and send it to everyone who ticked "Yes, AFRIFF can email me festival news and updates" in the app. Brevo delivers it. Only admins can see this page.</p>

    <!-- ---------- Set up? Who gets it? ---------- -->
    <section class="card mt-5 flex flex-col gap-3 p-4 text-meta">
      <p v-if="setup === undefined" class="text-muted">Checking the server…</p>
      <p v-else-if="setup === null" class="text-danger" role="alert">Couldn't check the server: {{ setupError }}</p>
      <p v-else class="flex items-start gap-2">
        <UiBadge :tone="setup.ready ? 'success' : 'danger'">{{ setup.ready ? 'Ready' : 'Off' }}</UiBadge>
        <span v-if="setup.ready"><strong class="font-semibold">Sending from {{ setup.from }}</strong> through Brevo.</span>
        <span v-else><strong class="font-semibold">Sending isn't set up yet.</strong> The staff app still needs: {{ setup.missing.join('; ') }}.</span>
      </p>
      <p class="flex items-start gap-2">
        <UiBadge tone="neutral">To</UiBadge>
        <span v-if="audienceError" class="text-danger">Couldn't count them: {{ audienceError }}</span>
        <span v-else-if="audience == null" class="text-muted">Counting…</span>
        <span v-else><strong class="font-semibold">{{ plural(audience, 'person', 'people') }}</strong> said yes to festival emails. Each email starts with "Hi &lt;first name&gt;," and ends with their own unsubscribe link.</span>
        <button type="button" class="pressable ml-auto grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink" aria-label="Count again" @click="loadAudience">
          <RefreshCwIcon class="size-4" />
        </button>
      </p>
      <p class="text-label text-muted">Brevo's free plan sends about 300 emails a day. With more people than that, sending pauses and you press Continue sending the next day; nobody gets it twice.</p>
    </section>

    <!-- ---------- Write ---------- -->
    <section class="mt-8">
      <h2 class="font-display text-h2 font-semibold">Write an email</h2>
      <form class="mt-3 flex flex-col gap-4" novalidate @submit.prevent="sendToAll">
        <AdminField
          v-for="f in FIELDS"
          :key="f.key"
          v-model="draft[f.key as Key]"
          :f="f"
          :refs="{}"
          :error="checks.errors[f.key]"
          @blur="checks.left(f.key)"
        />

        <div class="flex flex-col gap-1.5">
          <span class="text-meta font-medium text-muted">Preview (how it looks in the inbox)</span>
          <iframe
            v-if="hasText"
            ref="frame"
            title="Email preview"
            sandbox="allow-same-origin"
            class="w-full rounded-tile border border-line bg-white"
            :style="{ height: `${frameHeight}px` }"
            :srcdoc="previewHtml"
            @load="fitFrame"
          />
          <p v-else class="rounded-tile border border-dashed border-line px-3 py-6 text-center text-meta text-muted">The preview shows here as you write.</p>
        </div>

        <p v-if="state.error" class="text-meta text-danger" role="alert">{{ state.error }}</p>
        <p v-if="state.note" class="rounded-tile bg-accent-soft px-3 py-2 text-meta" role="status">{{ state.note }}</p>
        <p v-if="progress" class="text-meta text-muted" role="status">Sending… {{ progress.sent.toLocaleString('en-GB') }} of about {{ progress.total.toLocaleString('en-GB') }}. Keep this page open.</p>

        <div class="flex flex-wrap gap-2.5">
          <UiButton variant="secondary" size="lg" :disabled="!!state.busy || !setup?.ready" :loading="state.busy === 'test'" @click="test">
            <MailCheckIcon /> Send me a test
          </UiButton>
          <UiButton type="submit" size="lg" :disabled="!!state.busy || !setup?.ready || audience === 0" :loading="state.busy === 'send' && !continuing">
            <SendIcon /> {{ audience ? `Send to ${plural(audience, 'person', 'people')}` : 'Send to everyone' }}
          </UiButton>
        </div>
        <p class="text-label text-muted">The test goes only to you ({{ auth.user?.email }}), with [Test] in the subject.</p>
      </form>
    </section>

    <!-- ---------- Sent before ---------- -->
    <section class="mt-10">
      <h2 class="font-display text-h2 font-semibold">Sent emails</h2>
      <p v-if="listError" class="mt-2 text-meta text-danger" role="alert">{{ listError }}</p>
      <p v-else-if="list === null" class="mt-2 text-meta text-muted">Loading…</p>
      <p v-else-if="!list.length" class="mt-2 text-meta text-muted">None yet.</p>
      <ul class="mt-2 divide-y divide-line">
        <li v-for="e in list ?? []" :key="e.id" class="flex flex-col gap-1.5 py-3">
          <span class="flex items-start gap-2">
            <span class="min-w-0 flex-1 font-semibold">{{ e.subject }}</span>
            <UiBadge :tone="STATUS[e.status].tone">{{ STATUS[e.status].label }}</UiBadge>
          </span>
          <span class="text-meta text-muted">
            {{ whenLagos(e.createdAt) }}{{ e.createdByName ? ` · by ${e.createdByName}` : '' }} ·
            Sent to {{ e.sent.toLocaleString('en-GB') }}{{ e.status === 'sent' ? '' : ` of about ${e.total.toLocaleString('en-GB')}` }}{{ e.failed ? ` · ${plural(e.failed, 'address', 'addresses')} turned down` : '' }}
          </span>
          <span v-if="e.status === 'paused' && e.error" class="text-meta text-danger">{{ e.error }}</span>
          <span v-else-if="e.status === 'sending' && e.lockUntil > now" class="text-meta text-muted">Being sent right now{{ continuing === e.id ? '' : ' (another window or admin)' }}…</span>
          <details v-if="e.failures.length" class="text-meta">
            <summary class="cursor-pointer text-muted">Addresses Brevo turned down</summary>
            <ul class="mt-1 flex flex-col gap-0.5">
              <li v-for="f in e.failures" :key="f.email"><span class="font-medium">{{ f.email }}</span> <span class="text-muted">{{ f.reason }}</span></li>
            </ul>
          </details>
          <span class="flex flex-wrap gap-2">
            <UiButton v-if="canContinue(e)" size="sm" @click="carryOn(e)"><PlayIcon /> Continue sending</UiButton>
            <UiButton size="sm" variant="ghost" :disabled="!!state.busy" @click="copyIntoForm(e)"><CopyIcon /> Copy into the form</UiButton>
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>
