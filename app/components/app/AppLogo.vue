<script setup lang="ts">
/** Header logo: official AFRIFF emblem + wordmark. */
withDefaults(defineProps<{ showWordmark?: boolean; size?: number }>(), { showWordmark: true, size: 28 })
</script>

<template>
  <span class="inline-flex items-center gap-2.5 text-ink">
    <BrandEmblem :size="size" />
    <BrandWordmark v-if="showWordmark" class="h-4 w-auto" aria-hidden="true" />
    <span v-if="showWordmark" class="sr-only">AFRIFF</span>
  </span>
</template>
