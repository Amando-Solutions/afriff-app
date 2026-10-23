<script setup>
// Page title with its icon, the same size on every page.
defineProps({ title: { type: String, required: true }, icon: { type: [Object, Function], default: null }, description: { type: String, default: '' } })
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
    <div class="min-w-0">
      <h1 class="flex items-center gap-2.5 font-display text-h1 font-semibold">
        <component :is="icon" v-if="icon" class="size-6 shrink-0 text-accent-ink" :stroke-width="1.75" aria-hidden="true" />
        {{ title }}
      </h1>
      <p v-if="description" class="mt-1 max-w-xl text-muted">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
