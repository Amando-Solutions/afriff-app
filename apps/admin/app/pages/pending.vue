<script setup lang="ts">
import { signOut, type User } from 'firebase/auth'
import { LogOutIcon } from 'lucide-vue-next'
import { auth } from '~/lib/firebase'
import { createProfile, useAdminAuth } from '~/lib/useAdminAuth'

// Signed in, but not able to use the staff app yet: no role, no team profile,
// or the database can't be reached. When an admin gives a role on the Team
// page, this page moves on by itself (plugins/auth-guard.client.ts).
useHead({ title: 'Almost there' })
const auth$ = useAdminAuth()
const finishSetup = () => { if (auth$.user) createProfile(auth$.user as User).catch(() => {}) }
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center px-4 py-6">
    <div class="card flex w-full max-w-sm flex-col gap-3 p-6">
      <template v-if="auth$.error">
        <h1 class="font-display text-h1 font-semibold">Can't reach the database</h1>
        <p class="text-meta text-danger">{{ auth$.error }}</p>
        <p class="text-meta text-muted">Check the Firestore database exists and the rules from firestore.rules are published.</p>
      </template>
      <template v-else-if="!auth$.profile">
        <h1 class="font-display text-h1 font-semibold">Finish setting up</h1>
        <p class="text-muted">Your login works, but your team profile is missing.</p>
        <UiButton class="self-start" @click="finishSetup">Finish setup</UiButton>
      </template>
      <template v-else>
        <h1 class="font-display text-h1 font-semibold">Almost there</h1>
        <p>Your account <strong>{{ auth$.profile.email }}</strong> is set up, but an AFRIFF admin needs to give you a role before you can do anything.</p>
        <p class="text-meta text-muted">Ask your team lead to open Team in the admin console. This page updates by itself once they do.</p>
      </template>
      <!-- the two superadmin emails only: confirming it lets them straight in -->
      <AdminOwnerCheck v-if="auth$.profile" />
      <UiButton variant="secondary" size="sm" class="self-start" @click="signOut(auth)"><LogOutIcon /> Log out</UiButton>
    </div>
  </div>
</template>
