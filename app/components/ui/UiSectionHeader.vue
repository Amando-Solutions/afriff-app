<script setup>
import { ChevronRightIcon } from 'lucide-vue-next'

/** Section title with optional inline meta (e.g. a date) and a "See all" link. */
defineProps({
  title: { type: String, required: true },
  meta: { type: String, default: '' },
  to: { type: String, default: '' },
  linkLabel: { type: String, default: 'See all' },
})
defineEmits(['link'])
</script>

<template>
  <div class="mb-3 flex items-baseline justify-between gap-4">
    <div class="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
      <h2 class="font-display text-h2 font-semibold"><slot name="title">{{ title }}</slot></h2>
      <p v-if="meta" class="text-label text-muted tabular-nums">{{ meta }}</p>
    </div>
    <NuxtLink
      v-if="to"
      :to="to"
      class="group -mr-1 inline-flex min-h-8 shrink-0 items-center gap-0.5 rounded-full py-1 pr-1 pl-2 text-label font-medium text-muted transition-colors hover:text-ink"
      @click="$emit('link')"
    >
      {{ linkLabel }}
      <ChevronRightIcon class="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
    </NuxtLink>
  </div>
</template>
