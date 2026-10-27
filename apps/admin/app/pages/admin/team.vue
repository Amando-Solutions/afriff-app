<script setup lang="ts">
import { useAdminAuth } from '~/lib/useAdminAuth'

definePageMeta({ layout: 'console', section: 'team' })
useHead({ title: 'Team' })
const auth = useAdminAuth()
</script>

<template>
  <AdminTeam v-if="auth.profile" :me="auth.profile" />
</template>
