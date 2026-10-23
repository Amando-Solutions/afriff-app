<script setup>
/** Small static tag for status and attributes. */
defineProps({ tone: { type: String, default: 'neutral' } }) // neutral | accent | success | danger | info

const tones = {
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
