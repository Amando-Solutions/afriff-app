<script setup lang="ts">
import { computed } from 'vue'
import { BellIcon, CircleUserRoundIcon } from 'lucide-vue-next'
import { useUnreadCount } from '~/lib/alerts'
import { account } from '~/lib/account'

// Header on every screen: logo + name left; right, the bell with the unread
// count (opens News) and the person's avatar (opens Profile). Not signed in:
// a plain person icon, which opens Profile too (sign up, and the switches).
// Bell and person icon: same size and stroke, each centred in a 42px circle.
const unread = useUnreadCount()
const route = useRoute()
const p = computed(() => account.profile)
</script>

<template>
  <header class="header">
    <NuxtLink to="/" class="brand" aria-label="AFRIFF home">
      <BrandEmblem :size="40" />
      <span>AFRIFF</span>
    </NuxtLink>
    <div class="header-actions">
      <NuxtLink to="/news" class="bell" :aria-label="`News and alerts, ${unread} new`">
        <BellIcon :size="26" :stroke-width="1.8" />
        <span v-if="unread > 0" class="badge">{{ unread }}</span>
      </NuxtLink>
      <NuxtLink
        to="/profile"
        class="header-avatar"
        :class="{ on: route.path === '/profile' }"
        :aria-label="p ? `Your profile, ${p.firstName} ${p.lastName}` : 'Profile: sign up or log in'"
        :aria-current="route.path === '/profile' ? 'page' : undefined"
      >
        <UserAvatar v-if="p" :seed="p.uid" :size="30" :initials="(p.firstName[0] || '') + (p.lastName[0] || '')" />
        <CircleUserRoundIcon v-else :size="26" :stroke-width="1.8" />
      </NuxtLink>
    </div>
  </header>
</template>
