<script setup>
import { computed, ref, watch } from 'vue'

// A film's poster, or colour art when it has none (or the link breaks).
// Size and corner radius come from the class you pass (e.g. "w-12 rounded-thumb").
const props = defineProps({ film: { type: Object, required: true } })
const broken = ref(false)
watch(() => props.film.image, () => { broken.value = false })

const background = computed(() => {
  const { style, a, b } = props.film.poster || { style: 'glow', a: '#414ba3', b: '#0a1042' }
  if (style === 'stripes') return `repeating-linear-gradient(120deg, ${a} 0 14%, ${b} 14% 28%, #1a0d0d 28% 36%)`
  if (style === 'split') return `linear-gradient(160deg, ${a} 0 45%, ${b} 45% 100%)`
  return `radial-gradient(circle at 30% 30%, ${a} 0%, transparent 55%), radial-gradient(circle at 70% 75%, ${b} 0%, transparent 70%), #160b2a`
})
const showImage = computed(() => props.film.image && !broken.value)
</script>

<template>
  <div
    class="relative shrink-0 overflow-hidden outline -outline-offset-1 outline-white/10"
    :class="!showImage && 'grain'"
    :style="{ background }"
    role="img"
    :aria-label="`${film.title} poster`"
  >
    <!-- loads only when scrolled into view; if it fails, the colour art shows -->
    <img v-if="showImage" :src="film.image" alt="" loading="lazy" decoding="async" class="absolute inset-0 size-full object-cover" @error="broken = true" />
    <slot />
  </div>
</template>
