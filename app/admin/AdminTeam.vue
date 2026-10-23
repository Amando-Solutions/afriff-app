<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { ROLES } from './useAdminAuth'
import type { Profile, Role } from './types'
import { errMsg } from './util'
import { VENUES } from '~/data/programme'

// Admins only: everyone who has signed up, and what they're allowed to do.
const props = defineProps<{ me: Profile }>()
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
</script>

<template>
  <div>
    <h1 class="font-display text-h1 font-semibold">Team</h1>
    <p class="mt-1 text-muted">People sign up on the admin login page, then you choose what they can do here. Changes apply straight away.</p>
    <p v-if="waiting > 0" class="mt-4 rounded-tile border border-accent/50 bg-accent-soft px-3.5 py-3 font-semibold text-accent-ink">{{ waiting }} {{ waiting === 1 ? 'person is' : 'people are' }} waiting for access.</p>
    <p v-if="error" class="mt-3 text-meta text-danger" role="alert">{{ error }}</p>
    <p v-if="!people && !error" class="mt-3 text-muted">Loading…</p>

    <div class="mt-4 flex flex-col gap-2.5">
      <div v-for="p in people || []" :key="p.id" class="card flex flex-wrap items-center justify-between gap-2.5 p-3.5" :class="p.role === 'pending' && 'border-accent/50'">
        <div class="flex min-w-0 flex-col">
          <span class="font-semibold">{{ p.name || '(no name)' }}{{ p.id === props.me.id ? ' · you' : '' }}</span>
          <span class="text-meta text-muted">{{ p.email }}</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <select class="field-input h-10! w-auto!" :value="p.role" :disabled="p.id === props.me.id" :aria-label="`Role for ${p.name || p.email}`" @change="save(p, { role: ($event.target as HTMLSelectElement).value as Role })">
            <option v-for="(label, value) in ROLES" :key="value" :value="value">{{ label }}</option>
          </select>
          <select v-if="p.role === 'volunteer'" class="field-input h-10! w-auto!" :value="p.venue || ''" aria-label="Venue" @change="save(p, { venue: ($event.target as HTMLSelectElement).value || null })">
            <option value="">Choose venue…</option>
            <option v-for="v in VENUES" :key="v.id" :value="v.id">{{ v.name }}</option>
          </select>
        </div>
        <span v-if="p.id === props.me.id" class="w-full text-meta text-muted">You can't change your own role, so there's always an admin.</span>
      </div>
    </div>
  </div>
</template>
