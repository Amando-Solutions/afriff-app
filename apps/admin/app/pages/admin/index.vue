<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  ChartColumnIcon, ClipboardListIcon, DatabaseIcon, SendIcon, SquareCheckIcon, UserCheckIcon, UsersIcon,
} from 'lucide-vue-next'
import { venueById } from '@afriff/core/data/programme'
import { canOpen, type SectionId } from '~/lib/access'
import { ROLES, useAdminAuth } from '~/lib/useAdminAuth'

// Console home: one tile per section this role can open (rules in lib/access.ts).
definePageMeta({ layout: 'console', section: 'home' })
useHead({ title: 'Admin' })

// the attendee app is its own app and address (apps/pwa)
const attendeeUrl = useRuntimeConfig().public.attendeeUrl as string
const auth = useAdminAuth()

interface Tile { id: SectionId; title: string; text: string; icon: Component; to: string }
const TILES: Tile[] = [
  { id: 'team', title: 'Team', text: 'Give people roles and venues', icon: UsersIcon, to: '/admin/team' },
  { id: 'data', title: 'Festival data', text: 'Films, screenings, events, venues, news, sponsors, How to attend', icon: DatabaseIcon, to: '/admin/data' },
  { id: 'publish', title: 'Publish to app', text: 'Send the latest data to attendees\' phones', icon: SendIcon, to: '/admin/publish' },
  { id: 'reports', title: 'Reports', text: 'Most planned, ratings and app usage', icon: ChartColumnIcon, to: '/admin/reports' },
  { id: 'approvals', title: 'Approvals', text: 'Check editors\' changes before attendees see them', icon: SquareCheckIcon, to: '/admin/approvals' },
  { id: 'mine', title: 'My changes', text: 'Changes you sent for approval', icon: ClipboardListIcon, to: '/admin/mine' },
  { id: 'door', title: 'Door counter', text: 'Count queues at the door (opens the door view)', icon: UserCheckIcon, to: '/door' },
]
const tiles = computed(() => TILES.filter((t) => canOpen(auth.profile?.role, t.id)))
</script>

<template>
  <template v-if="auth.profile">
    <h1 class="font-display text-h1 font-semibold">Hello{{ auth.profile.name ? `, ${auth.profile.name.split(' ')[0]}` : '' }}</h1>
    <p class="mt-1 text-muted">
      You're logged in as <strong class="text-ink">{{ ROLES[auth.profile.role] }}</strong>{{ auth.profile.role === 'volunteer' && auth.profile.venue ? ` at ${venueById(auth.profile.venue)?.name}` : '' }}.
    </p>
    <div class="mt-5 grid gap-2.5 sm:grid-cols-2">
      <NuxtLink v-for="t in tiles" :key="t.id" :to="t.to" class="card card-interactive flex items-center gap-3.5 p-4">
        <span class="grid size-11 shrink-0 place-items-center rounded-tile border border-line bg-raised text-accent-ink"><component :is="t.icon" class="size-5" /></span>
        <span class="flex min-w-0 flex-col gap-0.5">
          <span class="flex items-center gap-2 font-semibold">{{ t.title }}<AdminPendingBadge v-if="t.id === 'approvals'" /></span>
          <span class="text-meta text-muted">{{ t.text }}</span>
        </span>
      </NuxtLink>
    </div>
    <a :href="attendeeUrl" class="mt-5 inline-block text-meta font-medium text-muted hover:text-ink">View the attendee app →</a>
  </template>
</template>
