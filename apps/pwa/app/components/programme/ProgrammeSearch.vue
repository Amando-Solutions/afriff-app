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
  <div v-if="open" class="search-screen" role="dialog" aria-label="Search films, directors and events">
    <div class="search-bar">
      <div class="search-box">
        <SearchIcon :size="20" />
        <input ref="input" v-model="q" placeholder="Search films, directors, events" aria-label="Search" autocomplete="off" enterkeyhint="search" @keydown.esc="open = false" />
      </div>
      <button type="button" class="icon-btn" aria-label="Close search" @click="open = false"><XIcon :size="22" /></button>
    </div>
    <div class="search-body">
      <p v-if="query && films.length + events.length === 0" class="empty">Nothing matches “{{ q }}”.</p>
      <NuxtLink v-for="e in events" :key="e.id" :to="`/event/${e.id}`" class="search-result" @click="open = false">
        <EventThumb :event="e" class="poster-thumb" />
        <span>
          <span class="row-title">{{ e.title }}</span>
          <span class="muted small">{{ EVENT_TYPES[e.type].label }}{{ e.speaker ? ` · ${e.speaker}` : '' }}</span>
        </span>
      </NuxtLink>
      <NuxtLink v-for="f in films" :key="f.id" :to="`/film/${f.id}`" class="search-result" @click="open = false">
        <FilmPoster :film="f" class="poster-thumb" />
        <span>
          <span class="row-title">{{ f.title }}</span>
          <span class="muted small">{{ [f.director, f.country].filter(Boolean).join(' · ') }}</span>
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
