<script setup lang="ts">
// AdminConfirm: the "Are you sure?" sheet every screen opens (lib/confirm.ts)
import AdminConfirm from '~/components/AdminConfirm.vue'
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AdminConfirm />
</template>
