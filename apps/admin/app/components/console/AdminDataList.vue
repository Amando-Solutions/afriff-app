<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from 'lucide-vue-next'
import { COLLECTIONS, type CollectionName } from '~/lib/schema'
import { useCollection } from '~/lib/data'
import { useRefs } from '~/lib/refs'
import { matchesSearch, searchWords } from '~/lib/search'

// List of one kind of data, with search (what each row shows, plus the
// collection's searchAlso fields, e.g. a film's country or cast).
const props = defineProps<{ col: CollectionName }>()
const c = COLLECTIONS[props.col]
const { state } = useCollection(props.col)
const refs = useRefs(props.col)
const q = ref('')

const shown = computed(() => {
  const words = searchWords(q.value)
  return (state.items || [])
    .filter((it) => matchesSearch(words, c.label(it, refs.value), c.sub(it, refs.value), c.searchAlso?.(it, refs.value)))
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
    <AdminSearch v-model="q" class="mt-4" :label="`Search ${c.title.toLowerCase()}`" />
    <p v-if="state.error" class="mt-3 text-meta text-danger">{{ state.error }}</p>
    <p v-if="state.items == null" class="mt-3 text-muted">Loading…</p>
    <p v-if="state.items?.length === 0" class="mt-3 text-muted">Nothing here yet. Add one, or load the festival data from the Festival data page.</p>
    <p v-else-if="state.items && !shown.length" class="mt-3 text-muted">Nothing matches “{{ q.trim() }}”.</p>
    <div v-if="shown.length" class="card mt-3 divide-y divide-line overflow-hidden">
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
