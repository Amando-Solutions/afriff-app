<script setup lang="ts">
import { signOut } from 'firebase/auth'
import { LogOutIcon } from 'lucide-vue-next'
import { auth } from '~/lib/firebase'
import { ROLES, useAdminAuth } from '~/lib/useAdminAuth'

// Every /admin page: top bar (logo → console home, role, log out) and the page.
// Logging out sends you to /login by itself (plugins/auth-guard.client.ts).
const auth$ = useAdminAuth()
</script>

<template>
  <div class="min-h-dvh">
    <!-- from @afriff/pwa: "You're offline" / "Back online" -->
    <AppOfflineBanner />
    <header class="pt-safe sticky top-0 z-40 border-b border-line bg-chrome backdrop-blur-xl">
      <div class="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
        <NuxtLink to="/admin" class="flex items-center gap-2" aria-label="Admin home">
          <AppLogo />
          <span class="font-display text-body font-semibold text-accent-ink">Admin</span>
        </NuxtLink>
        <UiBadge v-if="auth$.profile" tone="accent" class="ml-auto self-center!">{{ ROLES[auth$.profile.role] }}</UiBadge>
        <button type="button" class="pressable grid size-9 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink" :class="!auth$.profile && 'ml-auto'" aria-label="Log out" @click="signOut(auth)">
          <LogOutIcon class="size-5" />
        </button>
      </div>
    </header>

    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-12">
      <slot />
    </main>
  </div>
</template>
