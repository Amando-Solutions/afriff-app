<script setup lang="ts">
import { SearchIcon } from 'lucide-vue-next'

// The console's search box; lib/search.ts does the matching.
defineProps<{ label: string }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <label class="relative block">
    <SearchIcon class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
    <input v-model="model" type="search" maxlength="100" class="field-input pl-9!" :placeholder="label" :aria-label="label" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false">
  </label>
</template>
