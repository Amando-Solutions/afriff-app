<script setup lang="ts">
definePageMeta({ layout: 'console', section: 'invites' })
const route = useRoute()
</script>

<template>
  <AdminInvite :id="String(route.params.id)" :key="String(route.params.id)" />
</template>
