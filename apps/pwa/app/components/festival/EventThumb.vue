<script setup lang="ts">
import type { FestivalEvent } from '@afriff/core/types/festival'
import { computed, ref, watch } from 'vue'
import { eventLook } from '~/lib/eventLook'

// The event's graphic if it has one (e.g. masterclass posters), otherwise a
// colour tile with an icon for its type. Size comes from the class you pass.
const props = withDefaults(defineProps<{ event: Pick<FestivalEvent, 'type' | 'image'>; size?: number }>(), { size: 24 })
const broken = ref(false)
watch(() => props.event.image, () => { broken.value = false })
const look = computed(() => eventLook(props.event))
</script>

<template>
  <div v-if="event.image && !broken" class="poster event-thumb has-image" aria-hidden="true">
    <img :src="event.image" alt="" loading="lazy" decoding="async" @error="broken = true" />
  </div>
  <div v-else class="poster event-thumb" :style="{ background: `linear-gradient(150deg, ${look.a} 0%, ${look.b} 100%)` }" aria-hidden="true">
    <component :is="look.icon" :size="size" :stroke-width="1.8" />
  </div>
</template>
