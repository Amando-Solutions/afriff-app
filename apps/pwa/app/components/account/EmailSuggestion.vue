<script setup lang="ts">
// "Did you mean ada@gmail.com?" under an email box, for a likely typo in a
// well-known mail provider (emailSuggestion in @afriff/core/accounts/rules).
// Tapping it puts the corrected address in the box; ignoring it is fine.
defineProps<{ suggestion: string | null }>()
const emit = defineEmits<{ take: [] }>()
</script>

<template>
  <button v-if="suggestion" type="button" class="pressable self-start rounded-full text-left text-meta text-muted" @click="emit('take')">
    Did you mean <strong class="font-semibold text-accent-ink underline underline-offset-2">{{ suggestion }}</strong>?
  </button>
</template>
