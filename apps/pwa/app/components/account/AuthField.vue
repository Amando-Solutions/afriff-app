<script setup lang="ts">
// A labelled field on the sign-up page, with its problem (if any) under it.
// The input goes in the slot; give it id = fieldId and :aria-invalid.
defineProps<{ fieldId: string; label: string; error?: string; hint?: string }>()
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <label :for="fieldId" class="text-meta font-medium text-muted">{{ label }}</label>
    <slot />
    <p v-if="error" :id="`${fieldId}-error`" class="text-meta text-danger" role="alert">{{ error }}</p>
    <p v-else-if="hint" :id="`${fieldId}-hint`" class="text-label text-subtle">{{ hint }}</p>
  </div>
</template>
