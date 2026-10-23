<script setup>
import { BellIcon } from 'lucide-vue-next'
import { useUnreadCount } from '~/lib/alerts.js'

// Header on every screen: logo left, bell with the unread count right (opens News).
const unread = useUnreadCount()
</script>

<template>
  <header class="pt-safe sticky top-0 z-40 border-b border-line bg-chrome backdrop-blur-xl">
    <div class="mx-auto flex h-14 w-full max-w-xl items-center gap-4 px-4">
      <NuxtLink to="/" aria-label="AFRIFF home" class="rounded-lg">
        <AppLogo />
      </NuxtLink>
      <NuxtLink
        to="/news"
        class="pressable relative ml-auto grid size-10 place-items-center rounded-full text-ink hover:bg-hover"
        :aria-label="`News and alerts, ${unread} new`"
      >
        <BellIcon class="size-5" :stroke-width="1.75" />
        <span
          v-if="unread > 0"
          class="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.625rem] font-semibold text-on-accent tabular-nums"
          aria-hidden="true"
        >{{ unread }}</span>
      </NuxtLink>
    </div>
  </header>
</template>
