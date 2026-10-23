<script setup>
import { computed } from 'vue'
import { venueById } from '~/data/programme.js'

const props = defineProps({ venueId: { type: String, default: null }, size: { type: Number, default: 8 }, color: { type: String, default: '' } })
const bg = computed(() => props.color || venueById(props.venueId)?.color || 'var(--c-accent)')
</script>

<template>
  <span class="inline-block shrink-0 rounded-full" :style="{ background: bg, width: `${size}px`, height: `${size}px` }" aria-hidden="true" />
</template>
