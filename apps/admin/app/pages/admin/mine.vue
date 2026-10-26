<script setup lang="ts">
import { useAdminAuth } from '~/lib/useAdminAuth'

definePageMeta({ layout: 'console', section: 'mine' })
useHead({ title: 'My changes' })
const auth = useAdminAuth()
</script>

<template>
  <AdminMyChanges v-if="auth.profile" :profile="auth.profile" />
</template>
