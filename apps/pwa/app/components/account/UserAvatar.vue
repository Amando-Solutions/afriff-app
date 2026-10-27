<script setup lang="ts">
import { ref, watch } from 'vue'
import { drawAvatar, drawnAvatar } from '~/lib/avatar'

// A signed-in person's round avatar (lib/avatar.ts: a random DiceBear drawing,
// seeded by their account ID). Until it's drawn (a moment, the first time) or
// if the drawing code can't load, their initials show instead.
const props = withDefaults(defineProps<{ seed: string; size?: number; initials?: string }>(), { size: 40, initials: '' })

const src = ref('')
watch(() => props.seed, async (seed) => {
  src.value = drawnAvatar(seed)
  if (src.value || !seed) return
  try {
    const uri = await drawAvatar(seed)
    if (seed === props.seed) src.value = uri
  } catch { /* offline before the drawing code was ever saved: the initials stay */ }
}, { immediate: true })
</script>

<template>
  <span class="avatar" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.36)}px` }" aria-hidden="true">
    <img v-if="src" :src="src" alt="" :width="size" :height="size">
    <template v-else>{{ initials }}</template>
  </span>
</template>
