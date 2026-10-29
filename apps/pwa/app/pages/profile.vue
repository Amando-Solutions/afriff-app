<script setup lang="ts">
import { CircleUserRoundIcon } from 'lucide-vue-next'
import { useFestival } from '~/lib/store'

// PROFILE (the avatar beside the bell, on every screen): the account card
// (avatar, name, email, saved-to-account, festival emails), then this phone's
// switches: alerts and the anonymous counts, the privacy link, and at the very
// bottom Log out and Delete my account. Not signed in: an invitation to sign
// up, and the same switches.
useHead({ title: 'Profile' })
const { state, setSharing } = useFestival()
</script>

<template>
  <div class="page">
    <PageTitle title="Profile" :icon="CircleUserRoundIcon" />
    <AccountCard />
    <AlertsSwitch />
    <label class="share-row">
      <span class="share-text">
        <span class="share-title">Share anonymous counts with AFRIFF</span>
        <span class="muted small">No names or contact details: just which screenings are planned and how films are rated, to help plan the festival.</span>
      </span>
      <input type="checkbox" role="switch" class="switch" :checked="state.sharing" @change="setSharing(($event.target as HTMLInputElement).checked)" />
    </label>
    <p class="footnote"><NuxtLink to="/privacy" class="underline-link">How AFRIFF uses your details</NuxtLink></p>
    <AccountActions />
  </div>
</template>
