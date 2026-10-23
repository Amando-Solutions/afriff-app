<script setup>
import { computed } from 'vue'
import { statusTag } from '~/lib/alerts.js'

// "Cancelled" / "Moved" / "Time changed", set on a screening or event in the console
const props = defineProps({ status: { type: String, default: '' } })
const tag = computed(() => statusTag(props.status))
</script>

<template>
  <UiBadge v-if="tag" :tone="tag.tone === 'alert' ? 'danger' : 'accent'">{{ tag.text }}</UiBadge>
</template>
