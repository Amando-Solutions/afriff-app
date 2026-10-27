<script setup lang="ts">
import { CircleAlertIcon } from 'lucide-vue-next'
import type { AccountProblem } from '~/lib/account'

// A problem on the sign-up page that isn't about one field (e.g. "Too many
// tries"), with the next step as a button when there is one.
type Target = 'signup' | 'login' | 'forgot'
defineProps<{ problem: AccountProblem | null; action: { label: string; to: Target } | null }>()
const emit = defineEmits<{ action: [Target] }>()
</script>

<template>
  <div v-if="problem" role="alert" class="flex items-start gap-2.5 rounded-tile border border-danger/30 bg-danger-soft px-3 py-2.5">
    <CircleAlertIcon class="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
    <div class="flex min-w-0 flex-col items-start gap-1.5">
      <p class="text-meta text-ink">{{ problem.message }}</p>
      <button v-if="action" type="button" class="pressable text-meta font-semibold text-accent-ink" @click="emit('action', action.to)">{{ action.label }} →</button>
    </div>
  </div>
</template>
