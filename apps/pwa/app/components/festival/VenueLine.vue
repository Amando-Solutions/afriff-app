<script setup lang="ts">
import { computed } from 'vue'
import { venueById } from '@afriff/core/data/programme'

// Venue dot + venue name (or the event's own place), " · screen" when given.
const props = withDefaults(defineProps<{ venueId?: string | null; screen?: string; place?: string }>(), { venueId: null, screen: '', place: '' })
const name = computed(() => (props.venueId ? venueById(props.venueId)?.name : props.place) || '')
</script>

<template>
  <span class="venue-line">
    <VenueDot v-if="venueId" :venue-id="venueId" />
    {{ name }}{{ screen ? ` · ${screen}` : '' }}
    <slot />
  </span>
</template>
