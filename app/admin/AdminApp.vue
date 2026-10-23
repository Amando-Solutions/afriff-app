<script setup lang="ts">
import { computed, type Component } from 'vue'
import { signOut, type User } from 'firebase/auth'
import {
  ChartColumnIcon, ClipboardListIcon, DatabaseIcon, LogOutIcon, SendIcon, SquareCheckIcon, UserCheckIcon, UsersIcon,
} from 'lucide-vue-next'
import { venueById } from '~/data/programme'
import { auth } from './firebase'
import { ROLES, createProfile, useAdminAuth } from './useAdminAuth'
import { isCollection } from './schema'
import type { Role } from './types'
import AdminLogin from './AdminLogin.vue'
import AdminTeam from './AdminTeam.vue'
import AdminDataHome from './AdminDataHome.vue'
import AdminDataList from './AdminDataList.vue'
import AdminItemForm from './AdminItemForm.vue'
import AdminApprovals from './AdminApprovals.vue'
import AdminMyChanges from './AdminMyChanges.vue'
import AdminPublish from './AdminPublish.vue'
import AdminReports from './AdminReports.vue'
import AdminDoorCounter from './AdminDoorCounter.vue'
import AdminPendingBadge from './AdminPendingBadge.vue'

// The admin console at /admin. Addresses:
// /admin, /admin/team, /admin/data, /admin/data/<collection>, /admin/data/<collection>/<id or new>,
// /admin/publish, /admin/reports, /admin/approvals, /admin/mine, /admin/door
// With `door`, it's the volunteers' door view at /door instead (same logins, no console around it).
const props = withDefaults(defineProps<{ path?: string[]; door?: boolean }>(), { path: () => [], door: false })
const auth$ = useAdminAuth()

// What each role can open.
interface Section { id: string; title: string; text: string; icon: Component; roles: Role[]; to?: string }
const SECTIONS: Section[] = [
  { id: 'team', title: 'Team', text: 'Give people roles and venues', icon: UsersIcon, roles: ['admin'] },
  { id: 'data', title: 'Festival data', text: 'Films, screenings, events, venues, news, sponsors, How to attend', icon: DatabaseIcon, roles: ['admin', 'editor'] },
  { id: 'publish', title: 'Publish to app', text: 'Send the latest data to attendees\' phones', icon: SendIcon, roles: ['admin'] },
  { id: 'reports', title: 'Reports', text: 'Most planned, ratings and app usage', icon: ChartColumnIcon, roles: ['admin'] },
  { id: 'approvals', title: 'Approvals', text: 'Check editors\' changes before attendees see them', icon: SquareCheckIcon, roles: ['admin'] },
  { id: 'mine', title: 'My changes', text: 'Changes you sent for approval', icon: ClipboardListIcon, roles: ['editor'] },
  { id: 'door', title: 'Door counter', text: 'Count queues at the door (opens the door view)', icon: UserCheckIcon, roles: ['admin', 'volunteer'], to: '/door' },
]

const profile = computed(() => auth$.profile)
const mine = computed(() => SECTIONS.filter((s) => profile.value && s.roles.includes(profile.value.role)))
const section = computed(() => mine.value.find((s) => s.id === props.path[0]) || null)
const col = computed(() => (isCollection(props.path[1]) ? props.path[1] : null))
const itemId = computed(() => (col.value && props.path[2] ? props.path[2] : null))

const logOut = () => signOut(auth)
const finishSetup = () => { if (auth$.user) createProfile(auth$.user as User).catch(() => {}) }
</script>

<template>
  <div v-if="auth$.loading" class="grid min-h-dvh place-items-center"><p class="text-muted">Loading…</p></div>
  <AdminLogin v-else-if="!auth$.user" />

  <div v-else-if="auth$.error || !profile || profile.role === 'pending'" class="flex min-h-dvh items-center justify-center px-4 py-6">
    <div class="card flex w-full max-w-sm flex-col gap-3 p-6">
      <template v-if="auth$.error">
        <h1 class="font-display text-h1 font-semibold">Can't reach the database</h1>
        <p class="text-meta text-danger">{{ auth$.error }}</p>
        <p class="text-meta text-muted">Check the Firestore database exists and the rules from firestore.rules are published.</p>
      </template>
      <template v-else-if="!profile">
        <h1 class="font-display text-h1 font-semibold">Finish setting up</h1>
        <p class="text-muted">Your login works, but your team profile is missing.</p>
        <UiButton class="self-start" @click="finishSetup">Finish setup</UiButton>
      </template>
      <template v-else>
        <h1 class="font-display text-h1 font-semibold">Almost there</h1>
        <p>Your account <strong>{{ profile.email }}</strong> is set up, but an AFRIFF admin needs to give you a role before you can do anything.</p>
        <p class="text-meta text-muted">Ask your team lead to open Team in the admin console. This page updates by itself once they do.</p>
      </template>
      <UiButton variant="secondary" size="sm" class="self-start" @click="logOut"><LogOutIcon /> Log out</UiButton>
    </div>
  </div>

  <!-- /door: the volunteers' own view -->
  <div v-else-if="door" class="min-h-dvh px-4 pt-3.5 pb-10">
    <div v-if="!['admin', 'volunteer'].includes(profile.role)" class="flex min-h-[80dvh] items-center justify-center">
      <div class="card flex w-full max-w-sm flex-col gap-3 p-6">
        <h1 class="font-display text-h1 font-semibold">Door view</h1>
        <p>This page is for door volunteers. Ask an admin to give you the volunteer role and a venue.</p>
        <UiButton to="/admin" variant="secondary" size="sm" class="self-start">Go to the console</UiButton>
      </div>
    </div>
    <AdminDoorCounter v-else :profile="profile" standalone />
  </div>

  <div v-else>
    <header class="pt-safe sticky top-0 z-40 border-b border-line bg-chrome backdrop-blur-xl">
      <div class="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
        <NuxtLink to="/admin" class="flex items-center gap-2" aria-label="Admin home">
          <AppLogo />
          <span class="font-display text-body font-semibold text-accent-ink">Admin</span>
        </NuxtLink>
        <UiBadge tone="accent" class="ml-auto self-center!">{{ ROLES[profile.role] }}</UiBadge>
        <button type="button" class="pressable grid size-9 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink" aria-label="Log out" @click="logOut">
          <LogOutIcon class="size-5" />
        </button>
      </div>
    </header>

    <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-12">
      <AdminTeam v-if="section?.id === 'team'" :me="profile" />
      <AdminApprovals v-else-if="section?.id === 'approvals'" :profile="profile" />
      <AdminReports v-else-if="section?.id === 'reports'" />
      <AdminPublish v-else-if="section?.id === 'publish'" :profile="profile" />
      <AdminDoorCounter v-else-if="section?.id === 'door'" :profile="profile" />
      <AdminMyChanges v-else-if="section?.id === 'mine'" :profile="profile" />
      <template v-else-if="section?.id === 'data'">
        <AdminItemForm v-if="col && itemId" :key="col + itemId" :col="col" :id="itemId" :profile="profile" />
        <AdminDataList v-else-if="col" :key="col" :col="col" />
        <AdminDataHome v-else :profile="profile" />
      </template>

      <!-- Console home: one tile per thing this role can do -->
      <template v-else>
        <h1 class="font-display text-h1 font-semibold">Hello{{ profile.name ? `, ${profile.name.split(' ')[0]}` : '' }}</h1>
        <p class="mt-1 text-muted">
          You're logged in as <strong class="text-ink">{{ ROLES[profile.role] }}</strong>{{ profile.role === 'volunteer' && profile.venue ? ` at ${venueById(profile.venue)?.name}` : '' }}.
        </p>
        <div class="mt-5 grid gap-2.5 sm:grid-cols-2">
          <NuxtLink v-for="s in mine" :key="s.id" :to="s.to || `/admin/${s.id}`" class="card card-interactive flex items-center gap-3.5 p-4">
            <span class="grid size-11 shrink-0 place-items-center rounded-tile border border-line bg-raised text-accent-ink"><component :is="s.icon" class="size-5" /></span>
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="flex items-center gap-2 font-semibold">{{ s.title }}<AdminPendingBadge v-if="s.id === 'approvals'" /></span>
              <span class="text-meta text-muted">{{ s.text }}</span>
            </span>
          </NuxtLink>
        </div>
        <NuxtLink to="/" class="mt-5 inline-block text-meta font-medium text-muted hover:text-ink">View the attendee app →</NuxtLink>
      </template>
    </main>
  </div>
</template>
