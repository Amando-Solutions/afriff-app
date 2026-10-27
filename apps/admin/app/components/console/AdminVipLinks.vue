<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CheckIcon, CopyIcon, LinkIcon, Trash2Icon } from 'lucide-vue-next'
import type { Person } from '#shared/contacts'
import { LINK_LABEL_MAX, createVipLink, deleteVipLink, setVipLinkActive, vipLinkUrl, type Group, type VipLink } from '~/lib/contacts'
import { errMsg } from '~/lib/util'

// Admins: private sign-up links, one per group. Whoever signs up (or logs in)
// in the app through one lands in that group, marked VIP
// (apps/pwa/app/pages/vip/[code].vue; firestore.rules check it). The link's
// code is the secret: share it only with the guests it's for. Switching a link
// off stops new sign-ups through it; people already in stay.
const props = defineProps<{ groups: Group[]; links: VipLink[]; people: Person[] }>()

const form = reactive({ group: '', label: '', error: '', busy: false })
const state = reactive({ error: '', copied: '' })
const busyCode = ref('')

const groupName = (id: string) => props.groups.find((g) => g.id === id)?.name ?? '(deleted group)'
const joined = (code: string) => props.people.filter((p) => p.contact?.lastLink === code).length
const shown = computed(() => props.links.filter((l) => props.groups.some((g) => g.id === l.group)))

async function make() {
  const g = props.groups.find((x) => x.id === form.group)
  form.error = !g ? 'Choose the group the link puts people in.' : form.label.trim().length > LINK_LABEL_MAX ? `The name is too long (${LINK_LABEL_MAX} characters at most).` : ''
  if (form.error || !g) return
  form.busy = true
  try {
    await createVipLink(g, form.label)
    form.label = ''
  } catch (e) {
    form.error = errMsg(e)
  } finally {
    form.busy = false
  }
}

async function copy(code: string) {
  try {
    await navigator.clipboard.writeText(vipLinkUrl(code))
    state.copied = code
    setTimeout(() => { if (state.copied === code) state.copied = '' }, 2000)
  } catch {
    state.error = 'Couldn\'t copy: select the link and copy it by hand.'
  }
}

async function run(code: string, task: () => Promise<void>) {
  state.error = ''
  busyCode.value = code
  try {
    await task()
  } catch (e) {
    state.error = errMsg(e)
  } finally {
    busyCode.value = ''
  }
}

function remove(l: VipLink) {
  if (!window.confirm(`Delete the link "${l.label}"? It stops working for good; the ${joined(l.code)} people who joined through it stay in ${groupName(l.group)}.`)) return
  void run(l.code, () => deleteVipLink(l.code))
}
</script>

<template>
  <section>
    <h2 class="font-display text-h2 font-semibold">VIP sign-up links</h2>
    <p class="mt-1 text-meta text-muted">
      A private link for one group. Whoever signs up or logs in in the app through it lands in that group, marked VIP.
      Share it only with the guests it's for. Only admins see this.
    </p>

    <form class="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" novalidate @submit.prevent="make">
      <select v-model="form.group" class="field-input" aria-label="Group the link puts people in" @change="form.error = ''">
        <option value="">Which group?</option>
        <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
      </select>
      <input v-model="form.label" class="field-input" :maxlength="LINK_LABEL_MAX" placeholder="What guests see, e.g. Opening night" aria-label="What guests see">
      <UiButton type="submit" :loading="form.busy"><LinkIcon /> Make a link</UiButton>
    </form>
    <p v-if="form.error" class="mt-2 text-meta text-danger" role="alert">{{ form.error }}</p>
    <p v-if="!groups.length" class="mt-2 text-meta text-muted">Add a group first (above).</p>
    <p v-if="state.error" class="mt-2 text-meta text-danger" role="alert">{{ state.error }}</p>

    <ul class="mt-3 flex flex-col gap-2.5">
      <li v-for="l in shown" :key="l.code" class="card flex flex-col gap-2 p-3">
        <span class="flex flex-wrap items-center gap-2">
          <span class="font-semibold">{{ l.label }}</span>
          <UiBadge :tone="l.active ? 'success' : 'neutral'">{{ l.active ? 'On' : 'Switched off' }}</UiBadge>
          <span class="ml-auto text-label text-muted">→ {{ groupName(l.group) }} · {{ joined(l.code) }} joined</span>
        </span>
        <span class="flex items-center gap-2">
          <input :value="vipLinkUrl(l.code)" readonly class="field-input h-9! min-w-0 flex-1 text-label" aria-label="The link" @focus="($event.target as HTMLInputElement).select()">
          <UiButton size="sm" variant="secondary" @click="copy(l.code)"><component :is="state.copied === l.code ? CheckIcon : CopyIcon" /> {{ state.copied === l.code ? 'Copied' : 'Copy' }}</UiButton>
        </span>
        <span class="flex flex-wrap gap-2">
          <UiButton size="sm" variant="ghost" :disabled="busyCode === l.code" @click="run(l.code, () => setVipLinkActive(l.code, !l.active))">{{ l.active ? 'Switch off' : 'Switch on again' }}</UiButton>
          <UiButton size="sm" variant="ghost" :disabled="busyCode === l.code" @click="remove(l)"><Trash2Icon /> Delete</UiButton>
        </span>
      </li>
    </ul>
  </section>
</template>
