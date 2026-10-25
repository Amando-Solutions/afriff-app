<script setup lang="ts">
import AdminApp from '~/admin/AdminApp.vue'

// THE DOOR VIEW for volunteers at the cinema door. Same logins as the console.
// Volunteers save this page to their home screen; it works with no signal
// (taps wait on the phone and are sent when it's back).
useHead({ title: 'Door', meta: [{ name: 'robots', content: 'noindex' }] })
</script>

<template>
  <AdminApp door />
</template>
