<script setup lang="ts">
import { computed } from 'vue'
import { venueById } from '@afriff/core/data/programme'

const props = withDefaults(defineProps<{ venueId?: string | null; size?: number; color?: string }>(), { venueId: null, size: 8, color: '' })
const bg = computed(() => props.color || venueById(props.venueId)?.color || 'var(--gold)')
</script>

<template>
  <span class="dot" :style="{ background: bg, width: `${size}px`, height: `${size}px` }" aria-hidden="true" />
</template>
