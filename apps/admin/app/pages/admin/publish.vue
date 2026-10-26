<script setup lang="ts">
import { useAdminAuth } from '~/lib/useAdminAuth'

definePageMeta({ layout: 'console', section: 'publish' })
useHead({ title: 'Publish to app' })
const auth = useAdminAuth()
</script>

<template>
  <AdminPublish v-if="auth.profile" :profile="auth.profile" />
</template>
