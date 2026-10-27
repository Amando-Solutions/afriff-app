<script setup lang="ts">
import type { Queue } from '@afriff/core/types/festival'
import { computed } from 'vue'
import { queueLabel } from '@afriff/core/utils/format'

const props = defineProps<{ queue: Queue | null }>()
const label = computed(() => queueLabel(props.queue))
</script>

<template>
  <span v-if="queue && label" class="queue-tag" :class="`tone-${label.tone}`">
    <span class="pulse" aria-hidden="true" />
    {{ queue.inLine }} in line · {{ label.text }}
  </span>
</template>
