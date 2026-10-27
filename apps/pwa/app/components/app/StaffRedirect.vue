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
  <div class="page">
    <div class="empty-block">
      <h1 class="section-title">The staff console has moved</h1>
      <p class="muted">{{ target ? 'Taking you there now…' : 'Ask the AFRIFF team for the new address.' }}</p>
      <a v-if="target" class="btn btn-gold btn-small" :href="target">Open the staff console</a>
    </div>
  </div>
</template>
