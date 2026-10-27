<script setup lang="ts">
import type { Film } from '@afriff/core/types/festival'
import { computed, ref, watch } from 'vue'

// A film's poster, or colour art when it has none (or the link breaks).
// Size comes from the class you pass (poster-thumb, poster-mini, poster-sm…).
const props = defineProps<{ film: Pick<Film, 'title' | 'image' | 'poster'> }>()
const broken = ref(false)
watch(() => props.film.image, () => { broken.value = false })

const background = computed(() => {
  const { style, a, b } = props.film.poster || { style: 'glow', a: '#414ba3', b: '#0a1042' }
  if (style === 'stripes') return `repeating-linear-gradient(120deg, ${a} 0 14%, ${b} 14% 28%, #1a0d0d 28% 36%)`
  if (style === 'split') return `linear-gradient(160deg, ${a} 0 45%, ${b} 45% 100%)`
  return `radial-gradient(circle at 30% 30%, ${a} 0%, transparent 55%), radial-gradient(circle at 70% 75%, ${b} 0%, transparent 70%), #160b2a`
})
const showImage = computed(() => Boolean(props.film.image) && !broken.value)
</script>

<template>
  <div class="poster" :class="{ 'has-image': showImage }" :style="{ background }" role="img" :aria-label="`${film.title} poster`">
    <!-- loads only when scrolled into view; if it fails, the colour placeholder shows -->
    <img v-if="showImage" :src="film.image" alt="" loading="lazy" decoding="async" @error="broken = true" />
    <slot />
  </div>
</template>
