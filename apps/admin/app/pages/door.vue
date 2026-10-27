<script setup lang="ts">
import { useAdminAuth } from '~/lib/useAdminAuth'

// THE DOOR VIEW for volunteers at the cinema door (admins can open it too).
// Same logins as the console. Volunteers save this page to their home screen;
// it works with no signal (taps wait on the phone and are sent when it's back).
definePageMeta({ section: 'door' })
useHead({ title: 'Door' })
const auth = useAdminAuth()
</script>

<template>
  <div class="min-h-dvh px-4 pt-3.5 pb-10">
    <AdminDoorCounter v-if="auth.profile" :profile="auth.profile" standalone />
  </div>
</template>
