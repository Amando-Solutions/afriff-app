<script setup>
/** A filter chip. `on` shows it selected (gold outline, as before). */
defineProps({ on: Boolean, small: Boolean })
</script>

<template>
  <button
    type="button"
    :aria-pressed="on"
    class="pressable inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap [&_svg]:size-4"
    :class="[
      small ? 'h-8 px-3 text-label' : 'h-8 px-3 text-meta',
      on ? 'border-accent/60 bg-accent-soft text-accent-ink' : 'border-line bg-surface text-ink hover:border-line-strong hover:bg-hover',
    ]"
  >
    <slot />
  </button>
</template>
