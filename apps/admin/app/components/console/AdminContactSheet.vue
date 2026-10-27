<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Trash2Icon } from 'lucide-vue-next'
import { cleanName } from '@afriff/core/accounts/rules'
import { useFormChecks } from '@afriff/core/utils/formChecks'
import { CONSENT_LABEL, SOURCE_LABEL, type Person } from '#shared/contacts'
import { deleteAttendee } from '~/lib/attendees'
import { NOTES_MAX, guestEmailProblem, guestNameProblem, removeContact, saveContact, type Group, type VipLink } from '~/lib/contacts'
import { useAdminAuth } from '~/lib/useAdminAuth'
import { errMsg } from '~/lib/util'

// One contact: their groups, VIP mark and notes. A guest added by hand can
// also have their name, email and agreement changed; an app user's details
// and emails choice are their own (they change them in the app).
const props = defineProps<{ person: Person; groups: Group[]; people: Person[]; links: VipLink[] }>()
const emit = defineEmits<{ done: [note: string] }>()
const auth = useAdminAuth()
const isAdmin = computed(() => auth.profile?.role === 'admin')

const p = computed(() => props.person)
const handAdded = computed(() => !p.value.hasApp)
const form = reactive({
  firstName: p.value.firstName, lastName: p.value.lastName, email: p.value.email,
  vip: p.value.vip, groups: [...p.value.groups], agreed: p.value.contact?.agreed ?? false, notes: p.value.notes,
})
const checks = useFormChecks(() => ({
  ...(handAdded.value ? {
    firstName: () => guestNameProblem(form.firstName, 'first name'),
    lastName: () => guestNameProblem(form.lastName, 'last name'),
    email: () => guestEmailProblem(form.email),
  } : {}),
  notes: () => (form.notes.length > NOTES_MAX ? `Too long (${NOTES_MAX} characters at most).` : null),
}), (key) => form[key as 'firstName' | 'lastName' | 'email' | 'notes'])
watch(form, checks.recheck, { deep: true })
const errors = checks.errors

const busy = ref(false)
const problem = ref('')
const name = computed(() => `${p.value.firstName} ${p.value.lastName}`.trim() || p.value.email)
const when = (ms: number) => (ms ? new Date(ms).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }) : '')
const joinedVia = computed(() => props.links.find((l) => l.code === p.value.contact?.lastLink)?.label ?? '')

async function run(task: () => Promise<string>) {
  problem.value = ''
  busy.value = true
  try {
    emit('done', await task())
  } catch (e) {
    problem.value = errMsg(e)
  } finally {
    busy.value = false
  }
}

function save() {
  form.firstName = cleanName(form.firstName)
  form.lastName = cleanName(form.lastName)
  form.email = form.email.trim()
  if (!checks.checkAll()) return
  void run(async () => {
    await saveContact(p.value, form, props.people)
    return `Saved ${handAdded.value ? `${form.firstName} ${form.lastName}` : name.value}.`
  })
}

function remove() {
  const text = handAdded.value
    ? `Remove ${name.value} from contacts? They come off every group and guest list still to be sent.`
    : `Take ${name.value} out of every group and clear AFRIFF's notes about them? Their app account stays (it's theirs).`
  if (!window.confirm(text)) return
  void run(async () => {
    await removeContact(p.value)
    return handAdded.value ? `Removed ${name.value}.` : `Took ${name.value} out of every group.`
  })
}

function deleteAccount() {
  if (!window.confirm(`Delete ${name.value}'s app account (${p.value.email})? Their festival plan and watched list go too, and they get no more emails. This can't be undone.`)) return
  void run(async () => {
    const r = await deleteAttendee(p.value.uid)
    if (p.value.contact) await removeContact(p.value)
    return `Deleted ${p.value.email}'s account.${r.login === 'kept-staff' ? ' They\'re on the AFRIFF team, so their login stays.' : ''}`
  })
}

const aria = (key: string) => ({ 'aria-invalid': errors[key] ? true : undefined, 'aria-describedby': errors[key] ? `c-${key}-error` : undefined })
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="save">
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-meta">
      <dt class="text-muted">Email</dt><dd class="break-all">{{ p.email }}</dd>
      <dt class="text-muted">Joined</dt>
      <dd>
        {{ SOURCE_LABEL[p.source] }}{{ joinedVia ? ` (“${joinedVia}”)` : '' }}{{ p.contact?.addedByName && p.source === 'afriff' ? ` by ${p.contact.addedByName}` : '' }}{{ p.since ? `, ${when(p.since)}` : '' }}
        <span v-if="p.hasApp && p.source !== 'app'" class="text-muted">· has the app</span>
      </dd>
      <dt class="text-muted">Emails</dt>
      <dd>
        <UiBadge :tone="p.canEmail ? 'success' : 'neutral'">{{ CONSENT_LABEL[p.consent] }}</UiBadge>
        <span v-if="p.consent === 'agreed' && p.contact?.agreedByName" class="text-muted"> · ticked by {{ p.contact.agreedByName }}{{ p.contact.agreedAt ? `, ${when(p.contact.agreedAt)}` : '' }}</span>
      </dd>
    </dl>

    <template v-if="handAdded">
      <div class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
          First name
          <input v-model="form.firstName" class="field-input" maxlength="60" v-bind="aria('firstName')" @blur="checks.left('firstName')">
          <span v-if="errors.firstName" id="c-firstName-error" class="font-normal text-danger" role="alert">{{ errors.firstName }}</span>
        </label>
        <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
          Last name
          <input v-model="form.lastName" class="field-input" maxlength="60" v-bind="aria('lastName')" @blur="checks.left('lastName')">
          <span v-if="errors.lastName" id="c-lastName-error" class="font-normal text-danger" role="alert">{{ errors.lastName }}</span>
        </label>
      </div>
      <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
        Email
        <input v-model="form.email" class="field-input" type="email" maxlength="254" autocapitalize="off" spellcheck="false" v-bind="aria('email')" @blur="checks.left('email')">
        <span v-if="errors.email" id="c-email-error" class="font-normal text-danger" role="alert">{{ errors.email }}</span>
      </label>
    </template>
    <p v-else class="text-meta text-muted">Their name, email and emails choice belong to their app account: they change them in the app (Profile).</p>

    <fieldset class="flex flex-col gap-1.5">
      <legend class="text-meta font-medium text-muted">Groups</legend>
      <p v-if="!groups.length" class="text-meta text-muted">No groups yet.</p>
      <label v-for="g in groups" :key="g.id" class="flex items-center gap-3 py-1 text-body">
        <input v-model="form.groups" type="checkbox" :value="g.id" class="size-4 accent-[var(--c-accent)]"> {{ g.name }}
      </label>
    </fieldset>
    <label class="flex items-start gap-3 text-body">
      <input v-model="form.vip" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]"> VIP
    </label>
    <label v-if="handAdded" class="flex items-start gap-3 rounded-tile border border-line p-3 text-body">
      <input v-model="form.agreed" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]" :disabled="p.consent === 'unsubscribed'">
      <span>
        This guest agreed to receive AFRIFF invitations
        <small class="mt-0.5 block text-label text-muted">{{ p.consent === 'unsubscribed' ? 'They unsubscribed, so this can\'t be ticked again.' : 'Tick only if they told AFRIFF they\'re happy to get invitations by email.' }}</small>
      </span>
    </label>
    <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
      Notes
      <textarea v-model="form.notes" rows="2" class="field-input" :maxlength="NOTES_MAX" v-bind="aria('notes')" @blur="checks.left('notes')" />
      <span v-if="errors.notes" id="c-notes-error" class="font-normal text-danger" role="alert">{{ errors.notes }}</span>
    </label>

    <p v-if="problem" class="text-meta text-danger" role="alert">{{ problem }}</p>
    <UiButton type="submit" size="lg" block :loading="busy">Save</UiButton>
    <div class="flex flex-wrap gap-2 border-t border-line pt-4">
      <UiButton v-if="handAdded || p.contact" size="sm" variant="danger" :disabled="busy" @click="remove">
        <Trash2Icon /> {{ handAdded ? 'Remove from contacts' : 'Take out of every group' }}
      </UiButton>
      <UiButton v-if="isAdmin && p.hasApp" size="sm" variant="ghost" :disabled="busy" @click="deleteAccount">Delete their app account…</UiButton>
    </div>
  </form>
</template>
