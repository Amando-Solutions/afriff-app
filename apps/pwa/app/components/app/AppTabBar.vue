<script setup lang="ts">
import { computed } from 'vue'
import { BookmarkCheckIcon, CalendarDaysIcon, HouseIcon, UsersIcon } from 'lucide-vue-next'
import { openQueues, useLiveClock } from '~/lib/queues'

// Bottom navigation, 4 tabs. Film and event pages count as Programme; Jury and
// Venues count as Home (that's where you reach them from).
const route = useRoute()
const TABS = [
  { name: 'home', label: 'Home', to: '/', icon: HouseIcon },
  { name: 'programme', label: 'Programme', to: '/programme', icon: CalendarDaysIcon },
  { name: 'queues', label: 'Queues', to: '/queues', icon: UsersIcon },
  { name: 'my', label: 'My Festival', to: '/my', icon: BookmarkCheckIcon },
]
const active = computed(() => {
  const p = route.path
  if (p.startsWith('/programme') || p.startsWith('/film') || p.startsWith('/event')) return 'programme'
  if (p.startsWith('/queues')) return 'queues'
  if (p.startsWith('/my')) return 'my'
  if (p === '/' || p.startsWith('/jury') || p.startsWith('/venues')) return 'home'
  return null
})

// small gold dot on Queues while any queue is open (no words needed)
const clock = useLiveClock()
const queuesLive = computed(() => openQueues(clock.value).length > 0)
</script>

<template>
  <nav class="bottom-nav" aria-label="Main">
    <NuxtLink
      v-for="tab in TABS"
      :key="tab.name"
      :to="tab.to"
      class="tab"
      :class="{ on: active === tab.name }"
      :aria-current="active === tab.name ? 'page' : undefined"
    >
      <span class="tab-icon">
        <component :is="tab.icon" :size="24" :stroke-width="1.8" />
        <span v-if="tab.name === 'queues' && queuesLive" class="tab-dot" aria-label="Queues open now" />
      </span>
      <span class="tab-label">{{ tab.label }}</span>
    </NuxtLink>
  </nav>
</template>
