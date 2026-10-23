<script setup>
import AdminApp from '~/admin/AdminApp.vue'

// THE DOOR VIEW for volunteers at the cinema door. Same logins as the console,
// and like the console it's only downloaded when someone opens /door.
// Volunteers can save this page to their home screen.
definePageMeta({ layout: 'admin' })
useHead({ title: 'Door', meta: [{ name: 'robots', content: 'noindex' }] })
</script>

<template>
  <AdminApp door />
</template>
