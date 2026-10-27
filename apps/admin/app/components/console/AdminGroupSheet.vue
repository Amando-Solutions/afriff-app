<script setup lang="ts">
import { computed, ref } from 'vue'
import { Trash2Icon } from 'lucide-vue-next'
import type { Person } from '#shared/contacts'
import { deleteGroup, groupNameProblem, renameGroup, type Group, type VipLink } from '~/lib/contacts'
import { useAdminAuth } from '~/lib/useAdminAuth'
import { errMsg } from '~/lib/util'

// Rename a group (admins and editors) or delete it (admins: its people stay
// contacts, its VIP links stop working).
const props = defineProps<{ group: Group; groups: Group[]; members: Person[]; links: VipLink[] }>()
const emit = defineEmits<{ done: [note: string] }>()
const isAdmin = computed(() => useAdminAuth().profile?.role === 'admin')

const name = ref(props.group.name)
const error = ref('')
const busy = ref(false)
const groupLinks = computed(() => props.links.filter((l) => l.group === props.group.id))

async function run(task: () => Promise<string>) {
  error.value = ''
  busy.value = true
  try {
    emit('done', await task())
  } catch (e) {
    error.value = errMsg(e)
  } finally {
    busy.value = false
  }
}

function rename() {
  error.value = groupNameProblem(name.value, props.groups, props.group.id) ?? ''
  if (error.value) return
  void run(async () => {
    await renameGroup(props.group.id, name.value)
    return `Renamed to ${name.value.trim()}.`
  })
}

function remove() {
  const n = props.members.length
  const l = groupLinks.value.length
  if (!window.confirm(`Delete the group "${props.group.name}"? ${n} ${n === 1 ? 'person is' : 'people are'} taken out of it (they stay contacts)${l ? `, and its ${l} VIP ${l === 1 ? 'link stops' : 'links stop'} working` : ''}. Invites already sent aren't changed.`)) return
  void run(async () => {
    await deleteGroup(props.group.id, props.members, props.links)
    return `Deleted the group "${props.group.name}".`
  })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-meta text-muted">{{ members.length }} {{ members.length === 1 ? 'person' : 'people' }} in this group.</p>
    <form class="flex flex-col gap-2" novalidate @submit.prevent="rename">
      <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">
        Name
        <input v-model="name" class="field-input" maxlength="60" :aria-invalid="error ? true : undefined" @input="error = ''">
      </label>
      <p v-if="error" class="text-meta text-danger" role="alert">{{ error }}</p>
      <UiButton type="submit" :loading="busy">Rename</UiButton>
    </form>
    <div class="border-t border-line pt-4">
      <UiButton v-if="isAdmin" variant="danger" size="sm" :disabled="busy" @click="remove"><Trash2Icon /> Delete this group</UiButton>
      <p v-else class="text-meta text-muted">Only admins can delete a group.</p>
    </div>
  </div>
</template>
