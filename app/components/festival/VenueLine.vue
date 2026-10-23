<script setup>
import { computed } from 'vue'
import { venueById } from '~/data/programme.js'

const props = defineProps({ venueId: { type: String, default: null }, screen: { type: String, default: '' }, place: { type: String, default: '' } })
const name = computed(() => (props.venueId ? venueById(props.venueId)?.name : props.place) || '')
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-1.5 text-meta text-muted">
    <VenueDot v-if="venueId" :venue-id="venueId" />
    <span class="truncate">{{ name }}{{ screen ? ` · ${screen}` : '' }}</span>
    <slot />
  </span>
</template>
