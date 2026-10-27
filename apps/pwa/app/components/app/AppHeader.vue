<script setup lang="ts">
import { BellIcon } from 'lucide-vue-next'
import { useUnreadCount } from '~/lib/alerts'

// Header on every screen: logo + name left, bell with the unread count right (opens News).
const unread = useUnreadCount()
</script>

<template>
  <header class="header">
    <NuxtLink to="/" class="brand" aria-label="AFRIFF home">
      <BrandEmblem :size="40" />
      <span>AFRIFF</span>
    </NuxtLink>
    <NuxtLink to="/news" class="bell" :aria-label="`News and alerts, ${unread} new`">
      <BellIcon :size="26" :stroke-width="1.8" />
      <span v-if="unread > 0" class="badge">{{ unread }}</span>
    </NuxtLink>
  </header>
</template>
