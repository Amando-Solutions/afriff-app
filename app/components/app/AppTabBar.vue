<script setup>
import { computed } from 'vue'
import { BookmarkCheckIcon, CalendarDaysIcon, HouseIcon, UsersIcon } from 'lucide-vue-next'
import { openQueues, useLiveClock } from '~/lib/queues.js'

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
  <nav aria-label="Main" class="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-chrome backdrop-blur-xl">
    <ul class="mx-auto grid w-full max-w-xl grid-cols-4 px-2 py-1">
      <li v-for="tab in TABS" :key="tab.name" class="min-w-0">
        <NuxtLink
          :to="tab.to"
          :aria-current="active === tab.name ? 'page' : undefined"
          class="group flex h-16 w-full flex-col items-center justify-center gap-1 rounded-xl text-center text-micro font-medium transition-colors"
          :class="active === tab.name ? 'text-accent-ink' : 'text-muted'"
        >
          <span
            class="relative grid h-8 w-14 place-items-center rounded-full transition-[background-color,scale] duration-200 ease-out group-active:scale-95"
            :class="active === tab.name ? 'bg-accent-soft' : 'group-active:bg-raised'"
          >
            <span
              v-if="tab.name === 'queues' && queuesLive"
              class="absolute top-0.5 right-3 size-2 rounded-full bg-accent ring-2 ring-canvas"
              aria-label="Queues open now"
            />
            <component :is="tab.icon" class="size-5 shrink-0" :stroke-width="active === tab.name ? 2.25 : 1.75" aria-hidden="true" />
          </span>
          <span class="block whitespace-nowrap leading-4">{{ tab.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
