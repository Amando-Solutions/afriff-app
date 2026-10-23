<script setup>
defineProps({
  icon: { type: [Object, Function], default: null },
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="flex flex-col items-center px-6 py-10 text-center">
    <div v-if="icon" class="mb-4 grid size-12 place-items-center rounded-tile border border-line bg-surface text-muted shadow-card" aria-hidden="true">
      <component :is="icon" class="size-5" />
    </div>
    <h2 class="text-h3 font-semibold">{{ title }}</h2>
    <p v-if="description" class="mt-1.5 max-w-sm text-muted">{{ description }}</p>
    <div v-if="$slots.default" class="mt-5 flex flex-wrap justify-center gap-2">
      <slot />
    </div>
  </div>
</template>
