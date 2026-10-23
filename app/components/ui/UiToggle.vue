<script setup>
/** Two-icon view switch (list / timeline, grid / list). */
defineProps({ options: { type: Array, required: true }, label: { type: String, default: 'View' } })
const model = defineModel({ type: String, required: true })
</script>

<template>
  <div role="group" :aria-label="label" class="inline-flex shrink-0 rounded-full bg-raised p-0.5">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :aria-pressed="model === o.value"
      :aria-label="o.label"
      class="grid h-7 w-10 place-items-center rounded-full transition-[background-color,color,box-shadow] duration-200 ease-out"
      :class="model === o.value ? 'bg-surface text-accent-ink shadow-[0_1px_2px_rgb(2_4_20/0.12),0_0_0_1px_var(--c-line)]' : 'text-muted hover:text-ink'"
      @click="model = o.value"
    >
      <component :is="o.icon" class="size-4" aria-hidden="true" />
    </button>
  </div>
</template>
