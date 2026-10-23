<script setup lang="ts">
import type { Queue } from '~/types/festival'
import { computed } from 'vue'
import { queueLabel } from '~/lib/format'

const props = defineProps<{ queue: Queue | null }>()
const label = computed(() => queueLabel(props.queue))
</script>

<template>
  <span v-if="queue && label" class="inline-flex items-center gap-1.5 text-label font-semibold" :class="`tone-${label.tone}`">
    <span class="pulse" aria-hidden="true" />
    {{ queue.inLine }} in line · {{ label.text }}
  </span>
</template>
