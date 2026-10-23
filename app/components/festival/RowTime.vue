<script setup lang="ts">
import { computed } from 'vue'
import { time12 } from '~/lib/format'

// The time column of a schedule row: "6:30" big, "PM" small under it.
// Ink, not gold: gold is kept for actions and "in your plan".
const props = defineProps<{ time: string; /** replaces the big number, e.g. "Nightly" */ label?: string }>()
const t = computed(() => time12(props.time))
</script>

<template>
  <div class="w-14 shrink-0 pt-0.5 tabular-nums">
    <template v-if="label">
      <span class="block text-body leading-tight font-semibold text-ink">{{ label }}</span>
      <span class="mt-1 block text-micro font-medium text-muted">{{ t.time }} {{ t.ampm }}</span>
    </template>
    <template v-else>
      <span class="block font-display text-h3 leading-none font-semibold text-ink">{{ t.time }}</span>
      <span class="mt-1 block text-micro font-medium text-muted">{{ t.ampm }}</span>
    </template>
  </div>
</template>
