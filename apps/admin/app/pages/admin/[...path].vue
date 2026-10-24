<script setup lang="ts">
import { computed } from 'vue'
import AdminApp from '~/admin/AdminApp.vue'

// The admin console: Festival data, Approvals, Publish to app, Reports, Team…
// (its own app now, apps/admin, so attendees' phones never download it).
useHead({ title: 'Admin', meta: [{ name: 'robots', content: 'noindex' }] })
const route = useRoute()
const path = computed(() => (Array.isArray(route.params.path) ? route.params.path : [route.params.path]).filter((p): p is string => Boolean(p)))
</script>

<template>
  <AdminApp :path="path" />
</template>
