<script setup lang="ts">
import { askNote, confirmAction } from '~/lib/confirm'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { CalendarClockIcon, MailCheckIcon, SendIcon, Trash2Icon, XIcon } from 'lucide-vue-next'
import { useFormChecks } from '@afriff/core/utils/formChecks'
import { SKIP_LABEL, resolveAudience, type Person } from '#shared/contacts'
import {
  DEFAULT_MESSAGE, INVITE_LIMITS, cleanAudience, cleanInvite, defaultSubject, inviteProblems,
  type Audience, type InviteContent, type InviteField,
} from '#shared/invites'
import type { Group } from '~/lib/contacts'
import { useCollection } from '~/lib/data'
import {
  countGuests, deleteInvite, lagosInputToMs, msToLagosInput, saveInvite, sendTest, setReview,
  type InviteDoc, type InviteSetup,
} from '~/lib/invites'
import { matchesSearch, searchWords } from '~/lib/search'
import { useAdminAuth } from '~/lib/useAdminAuth'
import { errMsg } from '~/lib/util'

// An invitation while it's being written (draft) or waiting for an admin.
// Saved as you type. Editors: test it, then "Ask an admin to approve".
// Admins: test it, then Send now or Schedule (AdminInvite.vue asks "Send to N
// people?" and sends). What's checked: shared/invites.ts, the same checks the
// server makes before sending.
const props = defineProps<{ invite: InviteDoc; people: Person[] | null; groups: Group[]; setup: InviteSetup | null | undefined; busy: boolean }>()
const emit = defineEmits<{ send: [scheduledAt: number] }>()
const auth = useAdminAuth()
const isAdmin = computed(() => auth.profile?.role === 'admin')
const router = useRouter()

const content = reactive<InviteContent>(cleanInvite(props.invite))
const audience = reactive<Audience>(cleanAudience(props.invite.audience))
const isUpdate = computed(() => Boolean(props.invite.parentId))

// ---------- Saved as you type ----------
const saving = reactive({ state: 'saved' as 'saved' | 'dirty' | 'saving' | 'error', error: '' })
let timer: ReturnType<typeof setTimeout> | undefined
watch([() => JSON.stringify(content), () => JSON.stringify(audience)], () => {
  saving.state = 'dirty'
  clearTimeout(timer)
  timer = setTimeout(() => void saveNow(), 900)
})
async function saveNow() {
  clearTimeout(timer)
  if (saving.state === 'saved') return
  saving.state = 'saving'
  try {
    await saveInvite(props.invite.id, content, audience)
    saving.state = 'saved'
  } catch (e) {
    Object.assign(saving, { state: 'error', error: errMsg(e) })
    throw e
  }
}
onBeforeUnmount(() => { if (saving.state === 'dirty') void saveNow().catch(() => {}) })

// ---------- Checks (the field's problem shows when you leave it) ----------
const problems = computed(() => inviteProblems(content))
const FIELDS: InviteField[] = ['subject', 'artworkUrl', 'message', 'event.name', 'event.date', 'event.time', 'event.endTime', 'event.venue', 'event.mapLink', 'event.dressCode']
const valueOf = (key: string) => (key.startsWith('event.') ? content.event[key.slice(6) as keyof InviteContent['event']] : (content as unknown as Record<string, unknown>)[key])
const checks = useFormChecks(() => Object.fromEntries(FIELDS.map((k) => [k, () => problems.value[k] ?? null])), valueOf)
watch(content, checks.recheck, { deep: true })
const errors = checks.errors
const aria = (key: string) => ({ 'aria-invalid': errors[key] ? true : undefined, 'aria-describedby': errors[key] ? `inv-${key}-error` : undefined, onBlur: () => checks.left(key) })

// ---------- Event: fill from the festival's own events ----------
const events = useCollection('events')
const venues = useCollection('venues')
const festivalEvents = computed(() => (events.state.items ?? [])
  .filter((e) => typeof e.title === 'string' && typeof e.date === 'string')
  .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)))
const venueNames = computed(() => (venues.state.items ?? []).map((v) => String(v.name ?? '')).filter(Boolean))
const fromEvent = ref('')
watch(fromEvent, (id) => {
  const e = festivalEvents.value.find((x) => x.id === id)
  if (!e) return
  const venue = typeof e.venue === 'string' ? String(venues.map.value[e.venue]?.name ?? '') : ''
  Object.assign(content.event, {
    name: String(e.title ?? ''), date: String(e.date ?? ''), time: String(e.time ?? ''), endTime: String(e.end ?? ''),
    venue: venue || String(e.place ?? ''),
  })
  fromEvent.value = ''
})

// ---------- Who gets it ----------
const people = computed(() => props.people ?? [])
const byKey = computed(() => new Map(people.value.map((p) => [p.key, p])))
const resolved = computed(() => (isUpdate.value || !props.people ? null : resolveAudience(people.value, audience)))
const inGroup = (id: string) => people.value.filter((p) => p.groups.includes(id))
const nameOf = (key: string) => {
  const p = byKey.value.get(key)
  return p ? `${p.firstName} ${p.lastName}`.trim() || p.email : key
}
const search = reactive({ add: '', out: '' })
const matches = (q: string, skip: string[]) => {
  const words = searchWords(q)
  return words.join('').length < 2 ? [] : people.value.filter((p) => !skip.includes(p.key) && matchesSearch(words, p.firstName, p.lastName, p.email)).slice(0, 8)
}
function pick(list: 'people' | 'exclude', key: string) {
  if (!audience[list].includes(key)) audience[list].push(key)
  search[list === 'people' ? 'add' : 'out'] = ''
}
const unpick = (list: 'people' | 'exclude', key: string) => { audience[list] = audience[list].filter((k) => k !== key) }
const skipped = computed(() => {
  const out: Partial<Record<keyof typeof SKIP_LABEL, number>> = {}
  for (const s of resolved.value?.skipped ?? []) out[s.reason] = (out[s.reason] ?? 0) + 1
  return Object.entries(out) as [keyof typeof SKIP_LABEL, number][]
})
// an update goes to the people the invite went to (the guest list is admins-only, so the server counts)
const updateCount = ref<number | null>(null)
onMounted(async () => {
  if (isUpdate.value) updateCount.value = await countGuests(props.invite.id).then((c) => c.send, () => null)
})

const sampleGuest = computed(() => resolved.value?.send[0] ?? { firstName: (auth.profile?.name || 'Ada').split(/\s+/)[0] ?? 'Ada', lastName: '' })

// ---------- Test, approve, send ----------
const act = reactive({ busy: '' as '' | 'test' | 'review' | 'send' | 'delete', note: '', error: '' })
const testTo = ref(auth.user?.email ?? '')
const when = ref(msToLagosInput(Date.now() + 24 * 3_600_000).slice(0, 11) + '09:00')
const scheduling = ref(false)

/** Every field right */
function complete(): boolean {
  act.error = ''
  if (checks.checkAll()) return true
  act.error = `Fix the ${Object.keys(errors).length === 1 ? 'field' : `${Object.keys(errors).length} fields`} marked in red first.`
  return false
}

async function run(what: typeof act.busy, task: () => Promise<string | void>) {
  Object.assign(act, { busy: what, note: '', error: '' })
  try {
    const note = await task()
    if (note) act.note = note
  } catch (e) {
    act.error = errMsg(e)
  } finally {
    act.busy = ''
  }
}

function test() {
  if (!complete()) return
  void run('test', async () => {
    await saveNow()
    const r = await sendTest(props.invite.id, testTo.value)
    return `Test sent to ${r.to.join(', ')}. Check the inbox (and spam) in a minute.`
  })
}

function askApproval() {
  if (!complete()) return
  void run('review', async () => {
    await saveNow()
    await setReview(props.invite.id, 'review')
    return 'Sent for approval. An admin checks it and sends it.'
  })
}
const takeBack = () => run('review', () => setReview(props.invite.id, 'draft'))
async function sendBack() {
  const note = await askNote({
    title: 'Send it back to the editor?',
    message: 'It goes back to being a draft they can change, with your note on it.',
    noteLabel: 'What should the editor change?',
    placeholder: 'e.g. Add the dress code, and check the start time.',
    confirmLabel: 'Send back',
  })
  if (note === null) return
  void run('review', async () => {
    await setReview(props.invite.id, 'draft', note)
    return 'Sent back to the editor.'
  })
}

function sendNow(at = 0) {
  if (!complete()) return
  if (at) {
    if (!Number.isFinite(at)) { act.error = 'Pick the day and time to send it.'; return }
    if (at < Date.now() + 10 * 60_000) { act.error = 'Schedule it at least 10 minutes from now, or send it now.'; return }
    if (at > Date.now() + 71 * 3_600_000) { act.error = 'Brevo can hold an email for up to 3 days: pick a time in the next 71 hours.'; return }
  }
  void run('send', async () => {
    await saveNow()
    emit('send', at)
  })
}

async function remove() {
  const ok = await confirmAction({ title: 'Delete this draft?', message: 'This can\'t be undone.', confirmLabel: 'Delete draft', tone: 'danger' })
  if (!ok) return
  void run('delete', async () => {
    await deleteInvite(props.invite.id)
    await router.replace('/admin/invites')
  })
}
const canDelete = computed(() => isAdmin.value || props.invite.createdBy === auth.user?.uid)
const SAVE_TEXT = { saved: 'Saved', dirty: 'Not saved yet', saving: 'Saving…', error: 'Not saved' } as const
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="font-display text-h1 font-semibold">{{ isUpdate ? 'Update to guests' : content.event.name || 'New invitation' }}</h1>
      <UiBadge :tone="invite.status === 'review' ? 'accent' : 'neutral'">{{ invite.status === 'review' ? 'Waiting for approval' : 'Draft' }}</UiBadge>
      <span class="ml-auto text-label" :class="saving.state === 'error' ? 'text-danger' : 'text-muted'" role="status">{{ SAVE_TEXT[saving.state] }}<template v-if="saving.state === 'error'">: {{ saving.error }}</template></span>
    </div>
    <p class="mt-1 text-meta text-muted">
      By email, plus a push notification for guests who use the AFRIFF app (logged in, alerts on). {{ isAdmin ? 'Check it, send yourself a test, then send or schedule it.' : 'Send yourself a test, then ask an admin to approve it: only admins can send.' }}
      Started by {{ invite.createdByName || 'someone' }}.
    </p>
    <p v-if="invite.reviewNote && invite.status === 'draft'" class="mt-3 rounded-tile border border-accent/40 bg-accent-soft px-3 py-2 text-meta"><strong>Sent back by an admin:</strong> {{ invite.reviewNote }}</p>

    <!-- ---------- The event ---------- -->
    <section class="mt-6 flex flex-col gap-4">
      <h2 class="font-display text-h2 font-semibold">The event</h2>
      <label v-if="festivalEvents.length" class="flex flex-col gap-1.5 text-meta font-medium text-muted">
        Fill in from a festival event (optional)
        <select v-model="fromEvent" class="field-input">
          <option value="">Choose…</option>
          <option v-for="e in festivalEvents" :key="e.id" :value="e.id">{{ e.title }} · {{ e.date }} {{ e.time }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
        <span>Event name <em class="text-accent-ink not-italic">*</em></span>
        <input v-model="content.event.name" class="field-input" :maxlength="INVITE_LIMITS.name" placeholder="e.g. Opening Night Gala" v-bind="aria('event.name')">
        <span v-if="errors['event.name']" id="inv-event.name-error" class="font-normal text-danger" role="alert">{{ errors['event.name'] }}</span>
      </label>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label class="col-span-2 flex flex-col gap-1.5 text-meta font-medium text-muted sm:col-span-1">
          <span>Day <em class="text-accent-ink not-italic">*</em></span>
          <input v-model="content.event.date" class="field-input" type="date" v-bind="aria('event.date')">
        </label>
        <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
          <span>Starts <em class="text-accent-ink not-italic">*</em></span>
          <input v-model="content.event.time" class="field-input" type="time" v-bind="aria('event.time')">
        </label>
        <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
          Ends
          <input v-model="content.event.endTime" class="field-input" type="time" v-bind="aria('event.endTime')">
        </label>
      </div>
      <p v-for="k in (['event.date', 'event.time', 'event.endTime'] as const).filter((k) => errors[k])" :id="`inv-${k}-error`" :key="k" class="-mt-2 text-meta text-danger" role="alert">{{ errors[k] }}</p>
      <p class="-mt-2 text-label text-muted">Lagos time.</p>
      <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
        <span>Venue <em class="text-accent-ink not-italic">*</em></span>
        <input v-model="content.event.venue" class="field-input" list="invite-venues" :maxlength="INVITE_LIMITS.venue" placeholder="e.g. Filmhouse Landmark" v-bind="aria('event.venue')">
        <datalist id="invite-venues"><option v-for="v in venueNames" :key="v" :value="v" /></datalist>
        <span v-if="errors['event.venue']" id="inv-event.venue-error" class="font-normal text-danger" role="alert">{{ errors['event.venue'] }}</span>
      </label>
      <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
        Map link
        <input v-model="content.event.mapLink" class="field-input" type="url" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://maps.app.goo.gl/…" v-bind="aria('event.mapLink')">
        <span v-if="errors['event.mapLink']" id="inv-event.mapLink-error" class="font-normal text-danger" role="alert">{{ errors['event.mapLink'] }}</span>
        <small class="text-label font-normal">Optional. Empty: a Google Maps search for the venue.</small>
      </label>
      <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
        Dress code
        <input v-model="content.event.dressCode" class="field-input" :maxlength="INVITE_LIMITS.dressCode" placeholder="e.g. Black tie" v-bind="aria('event.dressCode')">
        <span v-if="errors['event.dressCode']" id="inv-event.dressCode-error" class="font-normal text-danger" role="alert">{{ errors['event.dressCode'] }}</span>
      </label>
    </section>

    <!-- ---------- The email ---------- -->
    <section class="mt-8 flex flex-col gap-4">
      <h2 class="font-display text-h2 font-semibold">The email</h2>
      <p class="-mt-2 text-meta text-muted">AFRIFF's invitation design: each guest gets it with their own name, the details above, "Add to calendar", "Get directions" and an unsubscribe link.</p>
      <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
        <span>{{ isUpdate ? 'What has changed' : 'Message' }}<em v-if="isUpdate" class="text-accent-ink not-italic"> *</em></span>
        <textarea v-model="content.message" rows="5" class="field-input" :maxlength="INVITE_LIMITS.message" :placeholder="isUpdate ? 'e.g. We now start at 8 PM. Same venue, same dress code.' : DEFAULT_MESSAGE" v-bind="aria('message')" />
        <span v-if="errors.message" id="inv-message-error" class="font-normal text-danger" role="alert">{{ errors.message }}</span>
        <small class="text-label font-normal">Under "Dear &lt;first name&gt;,". {{ isUpdate ? '' : 'Empty: the sentence shown in the box. ' }}Plain text: a blank line starts a new paragraph; links starting with https:// become clickable.</small>
      </label>
      <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
        Subject
        <input v-model="content.subject" class="field-input" :maxlength="INVITE_LIMITS.subject" :placeholder="defaultSubject(content)" v-bind="aria('subject')">
        <span v-if="errors.subject" id="inv-subject-error" class="font-normal text-danger" role="alert">{{ errors.subject }}</span>
        <small class="text-label font-normal">What guests see in their inbox. Empty: “{{ defaultSubject(content) }}”.</small>
      </label>
      <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
        Artwork image link
        <input v-model="content.artworkUrl" class="field-input" type="url" inputmode="url" autocapitalize="off" spellcheck="false" :maxlength="INVITE_LIMITS.artworkUrl" placeholder="https://…" v-bind="aria('artworkUrl')">
        <span v-if="errors.artworkUrl" id="inv-artworkUrl-error" class="font-normal text-danger" role="alert">{{ errors.artworkUrl }}</span>
        <small class="text-label font-normal">Optional: the event's artwork across the top, ideally 1200 pixels wide, landscape or square (a tall poster pushes the details down), JPG or PNG under 1 MB. Upload it where it gets a public https link (e.g. Brevo → Campaigns → File manager, or afriff.com) and paste the link. Every detail is also written in text, so nothing is lost when an email app hides images.</small>
      </label>
    </section>

    <!-- ---------- Who gets it ---------- -->
    <section class="mt-8 flex flex-col gap-4">
      <h2 class="font-display text-h2 font-semibold">Who gets it</h2>
      <p v-if="isUpdate" class="text-meta">
        The people the invitation went to{{ updateCount !== null ? `: ${updateCount.toLocaleString('en-GB')} can be emailed now` : '' }}. Anyone who unsubscribed since is left out.
      </p>
      <template v-else>
        <p v-if="!people" class="text-meta text-muted">Loading contacts…</p>
        <fieldset class="flex flex-col gap-1">
          <legend class="text-meta font-medium text-muted">Whole groups</legend>
          <p v-if="!groups.length" class="text-meta text-muted">No groups yet. Make them on the <NuxtLink to="/admin/contacts" class="text-accent-ink underline">Contacts</NuxtLink> page.</p>
          <label v-for="g in groups" :key="g.id" class="flex items-center gap-3 py-1 text-body">
            <input v-model="audience.groups" type="checkbox" :value="g.id" class="size-4 accent-accent">
            {{ g.name }} <span class="text-label text-muted tabular-nums">{{ inGroup(g.id).length }} · {{ inGroup(g.id).filter((p) => p.canEmail).length }} can be emailed</span>
          </label>
        </fieldset>

        <div v-for="list in (['people', 'exclude'] as const)" :key="list" class="flex flex-col gap-1.5">
          <span class="text-meta font-medium text-muted">{{ list === 'people' ? 'Also these people' : 'Leave out' }}</span>
          <div v-if="audience[list].length" class="flex flex-wrap gap-1.5">
            <span v-for="k in audience[list]" :key="k" class="inline-flex items-center gap-1 rounded-full border border-line bg-surface py-0.5 pr-1 pl-2.5 text-label">
              {{ nameOf(k) }}
              <button type="button" class="grid size-6 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink" :aria-label="`Remove ${nameOf(k)}`" @click="unpick(list, k)"><XIcon class="size-3.5" /></button>
            </span>
          </div>
          <input v-model="search[list === 'people' ? 'add' : 'out']" type="search" maxlength="100" class="field-input" :placeholder="list === 'people' ? 'Add someone: type a name or email' : 'Leave someone out: type a name or email'">
          <ul v-if="matches(search[list === 'people' ? 'add' : 'out'], audience[list]).length" class="card divide-y divide-line">
            <li v-for="p in matches(search[list === 'people' ? 'add' : 'out'], audience[list])" :key="p.key">
              <button type="button" class="flex w-full flex-col px-3 py-2 text-left hover:bg-hover" @click="pick(list, p.key)">
                <span class="font-medium">{{ `${p.firstName} ${p.lastName}`.trim() || p.email }}</span>
                <span class="text-label text-muted">{{ p.email }}{{ p.canEmail ? '' : ' · can\'t be emailed' }}</span>
              </button>
            </li>
          </ul>
        </div>

        <div v-if="resolved" class="card flex flex-col gap-1 p-3 text-meta" role="status">
          <p><strong class="font-display text-h2 font-semibold tabular-nums">{{ resolved.send.length.toLocaleString('en-GB') }}</strong> {{ resolved.send.length === 1 ? 'person gets' : 'people get' }} it, each once.</p>
          <p v-for="[reason, n] in skipped" :key="reason" class="text-muted">{{ n }} left out: {{ SKIP_LABEL[reason] }}.</p>
          <p v-if="resolved.excluded" class="text-muted">{{ resolved.excluded }} left out by you.</p>
          <p v-if="resolved.duplicates" class="text-muted">{{ resolved.duplicates }} counted twice (in two groups, or picked too): each gets it once.</p>
        </div>
      </template>
    </section>

    <!-- ---------- Preview and test ---------- -->
    <section class="mt-8 flex flex-col gap-4">
      <h2 class="font-display text-h2 font-semibold">Check it</h2>
      <AdminInvitePreview :content="content" :invite-id="invite.id" :guest="sampleGuest" />
      <form class="flex flex-col gap-1.5" novalidate @submit.prevent="test">
        <label for="inv-test" class="text-meta font-medium text-muted">Send a test to</label>
        <div class="flex gap-2">
          <input id="inv-test" v-model="testTo" class="field-input flex-1" type="text" inputmode="email" autocapitalize="off" spellcheck="false" maxlength="600" placeholder="you@afriff.com, colleague@…">
          <UiButton type="submit" variant="secondary" :loading="act.busy === 'test'" :disabled="!!act.busy || !setup?.ready"><MailCheckIcon /> Send test</UiButton>
        </div>
        <small class="text-label text-muted">Up to 5 addresses, separated by commas. "[Test]" goes in the subject. Do this before every real send.</small>
      </form>
      <p v-if="setup === null" class="text-meta text-danger">Couldn't reach the staff app's server.</p>
      <p v-else-if="setup && !setup.ready" class="text-meta text-danger">Sending isn't set up on the server yet: {{ setup.missing.join('; ') }}.</p>
    </section>

    <!-- ---------- Approve and send ---------- -->
    <section class="mt-8 flex flex-col gap-3 border-t border-line pt-6">
      <p v-if="act.error" class="text-meta text-danger" role="alert">{{ act.error }}</p>
      <p v-if="act.note" class="rounded-tile bg-accent-soft px-3 py-2 text-meta" role="status">{{ act.note }}</p>

      <template v-if="isAdmin">
        <div class="flex flex-wrap gap-2.5">
          <UiButton size="lg" :loading="act.busy === 'send' || (busy && !scheduling)" :disabled="!!act.busy || busy || !setup?.ready" @click="sendNow()"><SendIcon /> Send now…</UiButton>
          <UiButton size="lg" variant="secondary" :disabled="!!act.busy || busy" @click="scheduling = !scheduling"><CalendarClockIcon /> Schedule…</UiButton>
        </div>
        <div v-if="scheduling" class="card flex flex-col gap-2 p-3">
          <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
            Send on (Lagos time)
            <input v-model="when" type="datetime-local" class="field-input">
          </label>
          <small class="text-label text-muted">Brevo holds it until then: at least 10 minutes and at most 3 days ahead. It can be called off until its time.</small>
          <UiButton :disabled="!!act.busy || busy || !setup?.ready" @click="sendNow(lagosInputToMs(when))"><CalendarClockIcon /> Schedule…</UiButton>
        </div>
        <UiButton v-if="invite.status === 'review'" variant="ghost" size="sm" class="self-start" :disabled="!!act.busy" @click="sendBack">Send back to the editor…</UiButton>
      </template>
      <template v-else>
        <UiButton v-if="invite.status === 'draft'" size="lg" class="self-start" :loading="act.busy === 'review'" :disabled="!!act.busy" @click="askApproval"><SendIcon /> Ask an admin to approve</UiButton>
        <template v-else>
          <p class="text-meta">Waiting for an admin to approve and send it. Changes you make now are saved, and the admin sees them.</p>
          <UiButton variant="secondary" size="sm" class="self-start" :disabled="!!act.busy" @click="takeBack">Take it back to keep editing</UiButton>
        </template>
      </template>
      <UiButton v-if="canDelete" variant="ghost" size="sm" class="self-start text-danger!" :disabled="!!act.busy" @click="remove"><Trash2Icon /> Delete this draft</UiButton>
    </section>
  </div>
</template>
