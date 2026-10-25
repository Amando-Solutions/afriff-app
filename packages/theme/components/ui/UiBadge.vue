<script lang="ts">
export type BadgeTone = 'neutral' | 'accent' | 'success' | 'danger' | 'info'
</script>

<script setup lang="ts">
/** Small static tag for status and attributes. */
withDefaults(defineProps<{ tone?: BadgeTone }>(), { tone: 'neutral' })

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-raised text-muted',
  accent: 'bg-accent-soft text-accent-ink',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
}
</script>

<template>
  <span
    class="inline-flex max-w-full shrink-0 items-center gap-1 self-start rounded-tag px-1.5 py-px text-micro font-medium whitespace-nowrap [&_svg]:size-2.5 [&_svg]:shrink-0"
    :class="tones[tone]"
  >
    <slot />
  </span>
</template>
