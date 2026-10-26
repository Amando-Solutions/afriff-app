<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { SearchIcon, XIcon } from 'lucide-vue-next'
import { FILMS } from '@afriff/core/data/programme'
import { EVENTS, EVENT_TYPES } from '@afriff/core/data/events'

// Full-screen search for films, directors, events and speakers.
const open = defineModel<boolean>('open', { default: false })
const q = ref('')
const input = useTemplateRef<HTMLInputElement>('input')
watch(open, (v) => {
  if (v) nextTick(() => input.value?.focus())
  else q.value = ''
  document.body.style.overflow = v ? 'hidden' : ''
})

const query = computed(() => q.value.trim().toLowerCase())
const films = computed(() => (query.value ? FILMS.filter((f) => f.title.toLowerCase().includes(query.value) || f.director.toLowerCase().includes(query.value)) : []))
const events = computed(() => (query.value ? EVENTS.filter((e) => e.title.toLowerCase().includes(query.value) || (e.speaker || '').toLowerCase().includes(query.value)) : []))
</script>

<template>
  <div v-if="open" class="pt-safe fixed inset-0 z-[60] flex flex-col bg-canvas" role="dialog" aria-modal="true" aria-label="Search films, directors and events">
    <div class="mx-auto flex w-full max-w-xl items-center gap-2 border-b border-line px-4 py-3">
      <div class="relative flex-1">
        <SearchIcon class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
        <input
          ref="input"
          v-model="q"
          type="search"
          placeholder="Search films, directors, events"
          aria-label="Search"
          autocomplete="off"
          enterkeyhint="search"
          class="h-10 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-body text-ink shadow-card placeholder:text-subtle focus:border-accent/60 focus:shadow-[0_0_0_3px_var(--c-accent-soft)] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          @keydown.esc="open = false"
        />
      </div>
      <button type="button" class="pressable grid size-10 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink" aria-label="Close search" @click="open = false">
        <XIcon class="size-5" />
      </button>
    </div>
    <div class="mx-auto w-full max-w-xl flex-1 overflow-y-auto px-4 pb-8">
      <p v-if="query && films.length + events.length === 0" class="py-8 text-center text-muted">Nothing matches “{{ q }}”.</p>
      <p v-else-if="!query" class="py-8 text-center text-meta text-muted">Type a film title, a director, an event or a speaker.</p>
      <NuxtLink v-for="e in events" :key="e.id" :to="`/event/${e.id}`" class="row-interactive -mx-2 flex items-center gap-3 rounded-tile px-2 py-2.5" @click="open = false">
        <EventThumb :event="e" class="aspect-[4/5] w-11 rounded-thumb" />
        <span class="flex min-w-0 flex-col">
          <span class="truncate text-body font-semibold">{{ e.title }}</span>
          <span class="truncate text-meta text-muted">{{ EVENT_TYPES[e.type].label }}{{ e.speaker ? ` · ${e.speaker}` : '' }}</span>
        </span>
      </NuxtLink>
      <NuxtLink v-for="f in films" :key="f.id" :to="`/film/${f.id}`" class="row-interactive -mx-2 flex items-center gap-3 rounded-tile px-2 py-2.5" @click="open = false">
        <FilmPoster :film="f" class="aspect-[2/3] w-11 rounded-thumb" />
        <span class="flex min-w-0 flex-col">
          <span class="truncate text-body font-semibold">{{ f.title }}</span>
          <span class="truncate text-meta text-muted">{{ [f.director, f.country].filter(Boolean).join(' · ') }}</span>
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
