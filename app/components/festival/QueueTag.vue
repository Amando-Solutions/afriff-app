<script setup>
import { computed } from 'vue'
import { queueLabel } from '~/lib/format.js'

const props = defineProps({ queue: { type: Object, default: null } })
const label = computed(() => queueLabel(props.queue))
</script>

<template>
  <span v-if="label" class="inline-flex items-center gap-1.5 text-label font-semibold" :class="`tone-${label.tone}`">
    <span class="pulse" aria-hidden="true" />
    {{ queue.inLine }} in line · {{ label.text }}
  </span>
</template>
