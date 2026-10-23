<script setup lang="ts">
import { computed } from 'vue'
import { venueById } from '~/data/programme'

const props = withDefaults(defineProps<{ venueId?: string | null; screen?: string; place?: string }>(), { venueId: null, screen: '', place: '' })
const name = computed(() => (props.venueId ? venueById(props.venueId)?.name : props.place) || '')
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-1.5 text-meta text-muted">
    <VenueDot v-if="venueId" :venue-id="venueId" />
    <span class="truncate">{{ name }}{{ screen ? ` · ${screen}` : '' }}</span>
    <slot />
  </span>
</template>
