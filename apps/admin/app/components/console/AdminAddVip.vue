<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { cleanName } from '@afriff/core/accounts/rules'
import { useFormChecks } from '@afriff/core/utils/formChecks'
import { contactKey, type Person } from '#shared/contacts'
import { NOTES_MAX, addByHand, guestEmailProblem, guestNameProblem, type Group } from '~/lib/contacts'
import { errMsg } from '~/lib/util'

// "Add a VIP by hand": a guest who won't sign up themselves, labelled "Added
// by AFRIFF". They can only be emailed if the admin confirms they agreed.
// Someone already on the list isn't added twice (lib/contacts.ts addByHand).
const props = defineProps<{ groups: Group[]; people: Person[] }>()
const emit = defineEmits<{ done: [note: string] }>()

const form = reactive({ firstName: '', lastName: '', email: '', groups: [] as string[], vip: true, agreed: false, notes: '' })
const existing = computed(() => props.people.find((p) => p.key === contactKey(form.email)))

const checks = useFormChecks(() => ({
  firstName: () => (existing.value ? null : guestNameProblem(form.firstName, 'first name')),
  lastName: () => (existing.value ? null : guestNameProblem(form.lastName, 'last name')),
  email: () => guestEmailProblem(form.email),
  notes: () => (form.notes.length > NOTES_MAX ? `Too long (${NOTES_MAX} characters at most).` : null),
}), (key) => form[key as 'firstName' | 'lastName' | 'email' | 'notes'])
watch(form, checks.recheck, { deep: true })
const errors = checks.errors

const busy = ref(false)
const problem = ref('')

async function save() {
  problem.value = ''
  form.firstName = cleanName(form.firstName)
  form.lastName = cleanName(form.lastName)
  form.email = form.email.trim()
  if (!checks.checkAll()) return
  busy.value = true
  try {
    const was = existing.value
    const r = await addByHand({ ...form, notes: form.notes.trim() }, was)
    const name = was ? `${was.firstName} ${was.lastName}`.trim() || was.email : `${form.firstName} ${form.lastName}`
    emit('done', r === 'added' ? `Added ${name}.` : `${name} was already a contact: added to the groups${form.vip ? ' and marked VIP' : ''}.`)
  } catch (e) {
    problem.value = errMsg(e)
  } finally {
    busy.value = false
  }
}

const aria = (key: string) => ({ 'aria-invalid': errors[key] ? true : undefined, 'aria-describedby': errors[key] ? `vip-${key}-error` : undefined })
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="save">
    <p class="text-meta text-muted">For guests who won't sign up in the app themselves. They're labelled "Added by AFRIFF".</p>
    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
        First name
        <input v-model="form.firstName" class="field-input" maxlength="60" autocomplete="off" :disabled="!!existing" v-bind="aria('firstName')" @blur="checks.left('firstName')">
        <span v-if="errors.firstName" id="vip-firstName-error" class="font-normal text-danger" role="alert">{{ errors.firstName }}</span>
      </label>
      <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
        Last name
        <input v-model="form.lastName" class="field-input" maxlength="60" autocomplete="off" :disabled="!!existing" v-bind="aria('lastName')" @blur="checks.left('lastName')">
        <span v-if="errors.lastName" id="vip-lastName-error" class="font-normal text-danger" role="alert">{{ errors.lastName }}</span>
      </label>
    </div>
    <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
      Email
      <input v-model="form.email" class="field-input" type="email" inputmode="email" maxlength="254" autocapitalize="off" spellcheck="false" autocomplete="off" v-bind="aria('email')" @blur="checks.left('email')">
      <span v-if="errors.email" id="vip-email-error" class="font-normal text-danger" role="alert">{{ errors.email }}</span>
      <span v-else-if="existing" class="font-normal text-ink" role="status">
        Already a contact: <strong>{{ `${existing.firstName} ${existing.lastName}`.trim() || existing.email }}</strong>{{ existing.hasApp ? ' (signed up in the app)' : '' }}. Saving adds the groups below; their own details stay as they are.
      </span>
    </label>

    <fieldset class="flex flex-col gap-1.5">
      <legend class="text-meta font-medium text-muted">Groups</legend>
      <p v-if="!groups.length" class="text-meta text-muted">No groups yet: add one on the Contacts page first, or save and add them later.</p>
      <label v-for="g in groups" :key="g.id" class="flex items-center gap-3 py-1 text-body">
        <input v-model="form.groups" type="checkbox" :value="g.id" class="size-4 accent-[var(--c-accent)]"> {{ g.name }}
      </label>
    </fieldset>

    <label class="flex items-start gap-3 text-body">
      <input v-model="form.vip" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]">
      <span>VIP</span>
    </label>
    <label v-if="!existing?.hasApp" class="flex items-start gap-3 rounded-tile border border-line p-3 text-body">
      <input v-model="form.agreed" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]" :disabled="existing?.consent === 'unsubscribed'">
      <span>
        This guest agreed to receive AFRIFF invitations
        <small class="mt-0.5 block text-label text-muted">
          {{ existing?.consent === 'unsubscribed'
            ? 'They unsubscribed, so this can\'t be ticked again. They can sign up in the app and tick the box themselves.'
            : 'Tick only if they told AFRIFF they\'re happy to get invitations by email. Saved with your name and the date. Unticked, they\'re on the guest list but get no emails.' }}
        </small>
      </span>
    </label>
    <p v-else class="text-meta text-muted">They have an app account, so their own choice in the app decides whether they get emails.</p>

    <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
      Notes (optional)
      <textarea v-model="form.notes" rows="2" class="field-input" :maxlength="NOTES_MAX" placeholder="e.g. +1 guest, arrives with the Minister" v-bind="aria('notes')" @blur="checks.left('notes')" />
      <span v-if="errors.notes" id="vip-notes-error" class="font-normal text-danger" role="alert">{{ errors.notes }}</span>
    </label>

    <p v-if="problem" class="text-meta text-danger" role="alert">{{ problem }}</p>
    <UiButton type="submit" size="lg" block :loading="busy">{{ existing ? 'Add to these groups' : 'Add this guest' }}</UiButton>
  </form>
</template>
