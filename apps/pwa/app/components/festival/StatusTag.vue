<script setup lang="ts">
import { computed } from 'vue'
import { statusTag } from '~/lib/alerts'

// "Cancelled" / "Moved" / "Time changed", set on a screening or event in the console
const props = withDefaults(defineProps<{ status?: string }>(), { status: '' })
const tag = computed(() => statusTag(props.status))
</script>

<template>
  <span v-if="tag" class="status-tag" :class="`tone-${tag.tone}`">{{ tag.text }}</span>
</template>
