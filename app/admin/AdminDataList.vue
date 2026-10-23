<script setup>
import { computed, ref } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SearchIcon } from 'lucide-vue-next'
import { COLLECTIONS } from './schema.js'
import { useCollection } from './data.js'
import { useRefs } from './refs.js'

// List of one kind of data, with search.
const props = defineProps({ col: { type: String, required: true } })
const c = COLLECTIONS[props.col]
const { state } = useCollection(props.col)
const refs = useRefs(props.col)
const q = ref('')

const shown = computed(() => {
  const query = q.value.trim().toLowerCase()
  return (state.items || [])
    .filter((it) => !query || `${c.label(it, refs.value)} ${c.sub(it, refs.value)}`.toLowerCase().includes(query))
    .sort(c.sort)
})
</script>

<template>
  <div>
    <NuxtLink to="/admin/data" class="mb-2 inline-flex items-center gap-1 text-meta font-medium text-muted hover:text-ink"><ChevronLeftIcon class="size-4" /> Festival data</NuxtLink>
    <div class="flex items-center justify-between gap-3">
      <h1 class="font-display text-h1 font-semibold">{{ c.title }}</h1>
      <UiButton size="sm" :to="`/admin/data/${col}/new`"><PlusIcon /> Add {{ c.single }}</UiButton>
    </div>
    <div class="relative mt-4">
      <SearchIcon class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
      <input v-model="q" type="search" class="field-input rounded-full! pl-10!" :placeholder="`Search ${c.title.toLowerCase()}`" :aria-label="`Search ${c.title.toLowerCase()}`" />
    </div>
    <p v-if="state.error" class="mt-3 text-meta text-danger">{{ state.error }}</p>
    <p v-if="state.items == null" class="mt-3 text-muted">Loading…</p>
    <p v-if="state.items?.length === 0" class="mt-3 text-muted">Nothing here yet. Add one, or load the festival data from the Festival data page.</p>
    <div class="card mt-3 divide-y divide-line overflow-hidden">
      <NuxtLink v-for="it in shown" :key="it.id" :to="`/admin/data/${col}/${encodeURIComponent(it.id)}`" class="row-interactive flex items-center gap-3 px-4 py-3">
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="truncate font-semibold">{{ c.label(it, refs) }}</span>
          <span class="truncate text-meta text-muted">{{ c.sub(it, refs) }}</span>
        </span>
        <ChevronRightIcon class="size-[1.125rem] shrink-0 text-muted" />
      </NuxtLink>
    </div>
    <p v-if="state.items" class="mt-2 text-meta text-muted">{{ shown.length }} of {{ state.items.length }}</p>
  </div>
</template>
