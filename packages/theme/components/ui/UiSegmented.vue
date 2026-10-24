<script setup lang="ts" generic="T extends string">
// A small set of mutually exclusive choices (All / Films / Events).
withDefaults(defineProps<{ options: { value: T; label: string }[]; label: string; size?: 'sm' | 'md' }>(), { size: 'sm' })
const model = defineModel<T>({ required: true })
</script>

<template>
  <div role="radiogroup" :aria-label="label" class="inline-flex rounded-full bg-raised p-0.5">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      :aria-checked="model === o.value"
      class="inline-flex items-center rounded-full font-medium transition-[background-color,color,box-shadow] duration-200 ease-out"
      :class="[
        size === 'sm' ? 'h-7 px-3 text-label' : 'h-8 px-3.5 text-meta',
        model === o.value ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(2_4_20/0.12),0_0_0_1px_var(--c-line)]' : 'text-muted hover:text-ink',
      ]"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>
