<script setup lang="ts">
import { computed, ref } from 'vue'
import { renderInvite, subjectOf, type InviteContent } from '#shared/invites'

// How the invitation looks in a guest's inbox, made for one guest: exactly the
// email that's sent (shared/invites.ts renderInvite). Sandboxed: nothing in it can run.
const props = defineProps<{ content: InviteContent; inviteId: string; guest: { firstName: string; lastName: string } }>()

const attendeeUrl = useRuntimeConfig().public.attendeeUrl as string
const html = computed(() => renderInvite(props.content, props.guest, {
  calendar: `${window.location.origin}/api/invites/calendar?i=${props.inviteId}`,
  app: attendeeUrl,
  unsubscribe: `${window.location.origin}/api/invites/unsubscribe?p=test`,
}))
const ready = computed(() => Boolean(props.content.event.name))

const frame = ref<HTMLIFrameElement | null>(null)
const height = ref(900)
function fit() {
  const h = frame.value?.contentDocument?.documentElement.scrollHeight
  if (h) height.value = Math.min(h, 3000)
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-meta font-medium text-muted">Preview, as {{ `${guest.firstName} ${guest.lastName}`.trim() || 'a guest' }} would see it</span>
    <template v-if="ready">
      <p class="rounded-tile border border-line bg-raised px-3 py-2 text-meta"><span class="text-muted">Subject:</span> {{ subjectOf(content) }}</p>
      <iframe
        ref="frame"
        title="Invitation preview"
        sandbox="allow-same-origin allow-popups"
        class="w-full rounded-tile border border-line bg-white"
        :style="{ height: `${height}px` }"
        :srcdoc="html"
        @load="fit"
      />
    </template>
    <p v-else class="rounded-tile border border-dashed border-line px-3 py-6 text-center text-meta text-muted">The preview shows here once the event has a name.</p>
  </div>
</template>
