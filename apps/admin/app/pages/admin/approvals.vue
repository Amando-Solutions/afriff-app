<script setup lang="ts">
import { useAdminAuth } from '~/lib/useAdminAuth'

definePageMeta({ layout: 'console', section: 'approvals' })
useHead({ title: 'Approvals' })
const auth = useAdminAuth()
</script>

<template>
  <AdminApprovals v-if="auth.profile" :profile="auth.profile" />
</template>
