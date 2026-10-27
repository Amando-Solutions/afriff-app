<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore'
import { isSuperadminEmail, roleLock } from '#shared/team'
import { db } from '~/lib/firebase'
import { ROLES, useAdminAuth } from '~/lib/useAdminAuth'
import type { Profile, Role } from '~/lib/types'
import { matchesSearch, searchWords } from '~/lib/search'
import { errMsg } from '~/lib/util'
import { VENUES } from '@afriff/core/data/programme'

// Admins only: everyone who has signed up, and what they're allowed to do.
// Admins can make someone an admin but not take it away: only superadmins
// can (shared/team.ts). Admins never see the word: to them a superadmin is
// an admin like any other.
const props = defineProps<{ me: Profile }>()
const auth$ = useAdminAuth()
const people = ref<Profile[] | null>(null)
const error = ref('')

const stop = onSnapshot(
  query(collection(db, 'users'), orderBy('createdAt', 'desc')),
  (snap) => { people.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Profile) },
  (e) => { error.value = errMsg(e) },
)
onBeforeUnmount(stop)

async function save(person: Profile, changes: Partial<Pick<Profile, 'role' | 'venue'>>) {
  error.value = ''
  try {
    const next = { ...changes }
    // only door volunteers have a venue
    if (next.role && next.role !== 'volunteer') next.venue = null
    await updateDoc(doc(db, 'users', person.id), next)
  } catch (e) {
    error.value = `Couldn't save: ${errMsg(e)}`
  }
}
const waiting = computed(() => people.value?.filter((p) => p.role === 'pending').length || 0)

// Two tabs: the team itself (admins, editors, door volunteers) first, then
// everyone who has a staff login, "No access yet" included. Someone whose
// role was just changed stays in view until the tab changes, so taking a role
// away doesn't make them vanish mid-edit.
type View = 'team' | 'all'
const view = ref<View>('team')
const hasRole = (p: Profile) => p.role === 'admin' || p.role === 'editor' || p.role === 'volunteer'
const changed = ref(new Set<string>())
watch(view, () => { changed.value = new Set() })
const inView = computed(() => (view.value === 'all' ? people.value : people.value?.filter((p) => hasRole(p) || changed.value.has(p.id))) || [])

// Search by name or email (role and venue match too: "volunteer", "landmark").
// It looks in the open tab; nobody there but someone in All members → offer it.
const q = ref('')
const words = computed(() => searchWords(q.value))
const venueName = (id: string | null | undefined) => VENUES.find((v) => v.id === id)?.name
const found = (p: Profile) => matchesSearch(words.value, p.name, p.email, ROLES[p.role], venueName(p.venue))
const shown = computed(() => inView.value.filter(found))
const inAll = computed(() => (view.value === 'team' && words.value.length ? (people.value ?? []).filter(found).length - shown.value.length : 0))
const views = computed(() => [
  { value: 'team' as View, label: `With a role · ${people.value?.filter(hasRole).length ?? 0}` },
  { value: 'all' as View, label: `All members · ${people.value?.length ?? 0}` },
])

const lockOf = (p: Profile) => roleLock(p, { id: props.me.id, superadmin: auth$.superadmin })

function lockNote(p: Profile) {
  const lock = lockOf(p)
  if (lock === 'self') return "You can't change your own role, so there's always an admin."
  if (lock === 'superadmin' && auth$.superadmin) return "Superadmins can't be changed."
  if (lock) return p.role === 'admin' ? "Admins can't remove other admins." : "This person's role can't be changed here."
  return ''
}

// Making an admin can't be undone by an admin, and removing one is rare: ask first.
function pickRole(person: Profile, select: HTMLSelectElement) {
  const role = select.value as Role
  const name = person.name || person.email
  const question = role === 'admin'
    ? `Make ${name} an admin? Admins can do everything in the console${auth$.superadmin ? '' : ", and you won't be able to take it back"}.`
    : person.role === 'admin' ? `Take away ${name}'s admin access? They'll be: ${ROLES[role]}.` : ''
  if (question && !window.confirm(question)) {
    select.value = person.role
    return
  }
  changed.value.add(person.id)
  save(person, { role })
}
</script>

<template>
  <div>
    <h1 class="font-display text-h1 font-semibold">Team</h1>
    <p class="mt-1 text-muted">People sign up on the admin login page, then you choose what they can do here. Changes apply straight away. Someone who already uses the festival app logs in there with the same email and password.</p>
    <p v-if="waiting > 0" class="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-tile border border-accent/50 bg-accent-soft px-3.5 py-3 font-semibold text-accent-ink">
      {{ waiting }} {{ waiting === 1 ? 'person is' : 'people are' }} waiting for access.
      <UiButton v-if="view === 'team'" size="sm" variant="secondary" @click="view = 'all'">See them</UiButton>
    </p>
    <AdminOwnerCheck class="mt-4" />
    <p v-if="error" class="mt-3 text-meta text-danger" role="alert">{{ error }}</p>
    <p v-if="!people && !error" class="mt-3 text-muted">Loading…</p>

    <template v-if="people">
      <UiSegmented v-model="view" :options="views" label="Who to show" size="md" class="mt-4" />
      <p class="mt-2 text-meta text-muted">{{ view === 'team' ? 'Admins, editors and door volunteers.' : 'Everyone with a staff login, including people with no access yet.' }}</p>
      <AdminSearch v-model="q" class="mt-3" label="Search by name or email" />
      <p v-if="words.length && !shown.length" class="mt-4 flex flex-wrap items-center gap-2 text-muted">
        Nobody {{ view === 'team' ? 'with a role ' : '' }}matches “{{ q.trim() }}”.
        <UiButton v-if="inAll" size="sm" variant="secondary" @click="view = 'all'">Look in All members ({{ inAll }})</UiButton>
      </p>
      <p v-else-if="words.length" class="mt-2 text-meta text-muted">
        {{ shown.length }} of {{ inView.length }}<template v-if="inAll"> · <button type="button" class="font-medium text-accent-ink underline" @click="view = 'all'">{{ inAll }} more in All members</button></template>
      </p>
    </template>

    <div class="mt-4 flex flex-col gap-2.5">
      <div v-for="p in shown" :key="p.id" class="card flex flex-wrap items-center justify-between gap-2.5 p-3.5" :class="p.role === 'pending' && 'border-accent/50'">
        <div class="flex min-w-0 flex-col">
          <span class="flex flex-wrap items-center gap-1.5 font-semibold">
            {{ p.name || '(no name)' }}{{ p.id === props.me.id ? ' · you' : '' }}
            <UiBadge v-if="auth$.superadmin && isSuperadminEmail(p.email)" tone="accent">Superadmin</UiBadge>
          </span>
          <span class="text-meta text-muted">{{ p.email }}</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <select class="field-input h-10! w-auto!" :value="p.role" :disabled="!!lockOf(p)" :aria-label="`Role for ${p.name || p.email}`" @change="pickRole(p, $event.target as HTMLSelectElement)">
            <option v-for="(label, value) in ROLES" :key="value" :value="value">{{ label }}</option>
          </select>
          <select v-if="p.role === 'volunteer'" class="field-input h-10! w-auto!" :value="p.venue || ''" :disabled="!!lockOf(p)" aria-label="Venue" @change="save(p, { venue: ($event.target as HTMLSelectElement).value || null })">
            <option value="">Choose venue…</option>
            <option v-for="v in VENUES" :key="v.id" :value="v.id">{{ v.name }}</option>
          </select>
        </div>
        <span v-if="lockNote(p)" class="w-full text-meta text-muted">{{ lockNote(p) }}</span>
      </div>
    </div>
  </div>
</template>
