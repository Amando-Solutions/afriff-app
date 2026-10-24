<script setup lang="ts">
/**
 * The AFRIFF emblem, cut from the official logo on afriff.com.
 * `size` is the rendered size in CSS pixels; the right resolution is picked via srcset.
 */
withDefaults(defineProps<{ size?: number; decorative?: boolean }>(), { size: 32, decorative: true })
</script>

<template>
  <img
    src="/brand/afriff-emblem-192.webp"
    srcset="/brand/afriff-emblem-96.webp 96w, /brand/afriff-emblem-192.webp 192w, /brand/afriff-emblem-384.webp 384w"
    :sizes="`${size}px`"
    :width="size"
    :height="size"
    :alt="decorative ? '' : 'AFRIFF emblem'"
    class="shrink-0 select-none"
    draggable="false"
    decoding="async"
  />
</template>
