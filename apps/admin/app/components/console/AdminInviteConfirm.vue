<script setup lang="ts">
import { computed } from 'vue'
import { SendIcon } from 'lucide-vue-next'
import { SKIP_LABEL } from '#shared/contacts'
import type { Count } from '~/lib/invites'

// The last step before sending (admins): "Send to 87 people?", with who's left
// out and why. Nothing goes until "Send" is pressed here.
const props = defineProps<{ count: Count; mode: 'all' | 'new' | 'resend'; subject: string; when: string; busy: boolean; scheduledPushes: boolean }>()
const emit = defineEmits<{ send: []; cancel: [] }>()

const n = computed(() => (props.mode === 'new' ? props.count.newPeople : props.count.send))
const people = (k: number) => `${k.toLocaleString('en-GB')} ${k === 1 ? 'person' : 'people'}`
const headline = computed(() => {
  const who = props.mode === 'new' ? `${n.value.toLocaleString('en-GB')} new ${n.value === 1 ? 'person' : 'people'}` : people(n.value)
  return props.when ? `Schedule for ${who}?` : `Send to ${who}?`
})
const skipped = computed(() => Object.entries(props.count.skipped).filter(([, k]) => k) as [keyof typeof SKIP_LABEL, number][])
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="font-display text-h1 font-semibold">{{ headline }}</p>
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-meta">
      <dt class="text-muted">Subject</dt><dd>{{ subject }}</dd>
      <dt class="text-muted">When</dt>
      <dd v-if="!when">Now. Guests who use the AFRIFF app (logged in, alerts on) also get a push notification.</dd>
      <dd v-else-if="scheduledPushes">{{ when }} (Lagos time). Brevo holds it until then. Guests who use the AFRIFF app (logged in, alerts on) get a push notification within a minute of it going out.</dd>
      <dd v-else>{{ when }} (Lagos time). Brevo holds it until then. By email only for now: the Cloud Function that sends push notifications for scheduled invitations isn't running (see the Invitations page).</dd>
      <template v-if="mode === 'new'">
        <dt class="text-muted">Already sent</dt><dd>{{ people(count.send - count.newPeople) }} (they don't get it again)</dd>
      </template>
    </dl>
    <ul v-if="skipped.length || count.excluded || count.duplicates" class="flex flex-col gap-1 rounded-tile bg-raised px-3 py-2.5 text-meta">
      <li v-for="[reason, k] in skipped" :key="reason">Left out: {{ people(k) }} who {{ SKIP_LABEL[reason] }}.</li>
      <li v-if="count.excluded">Left out by you: {{ people(count.excluded) }}.</li>
      <li v-if="count.duplicates">{{ people(count.duplicates) }} counted twice (in two groups, or picked too): each gets it once.</li>
    </ul>
    <details v-if="count.skippedPeople.length" class="text-meta">
      <summary class="cursor-pointer text-muted">Who's left out</summary>
      <ul class="mt-1 flex flex-col gap-0.5">
        <li v-for="p in count.skippedPeople" :key="p.email"><span class="font-medium">{{ p.name || p.email }}</span> <span class="text-muted">{{ p.email }} · {{ SKIP_LABEL[p.reason] }}</span></li>
      </ul>
    </details>
    <p class="text-meta text-muted">Once it's sent it can't be called back{{ when ? ' (a scheduled one can, until its time)' : '' }}. Sent yourself a test first?</p>
    <div class="flex flex-wrap gap-2.5">
      <UiButton size="lg" :loading="busy" :disabled="!n" @click="emit('send')"><SendIcon /> {{ when ? 'Schedule' : 'Send' }}</UiButton>
      <UiButton size="lg" variant="secondary" :disabled="busy" @click="emit('cancel')">Not yet</UiButton>
    </div>
  </div>
</template>
