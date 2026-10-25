<script setup lang="ts">
import { onMounted } from 'vue'

// /admin and /door used to live in this app. They're the staff console now
// (apps/admin, its own address). Old bookmarks, home-screen icons and QR codes
// land here and are sent on, keeping the rest of the address.
const route = useRoute()
const adminUrl = (useRuntimeConfig().public.adminUrl as string).replace(/\/+$/, '')
const target = adminUrl ? `${adminUrl}${route.fullPath}` : ''
onMounted(() => {
  if (target) window.location.replace(target)
})
</script>

<template>
  <UiEmptyState
    title="The staff console has moved"
    :description="target ? 'Taking you there now…' : 'Ask the AFRIFF team for the new address.'"
  >
    <UiButton v-if="target" :href="target">Open the staff console</UiButton>
  </UiEmptyState>
</template>
