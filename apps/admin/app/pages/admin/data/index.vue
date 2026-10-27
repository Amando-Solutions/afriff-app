<script setup lang="ts">
import { useAdminAuth } from '~/lib/useAdminAuth'

// Festival data home: one card per kind of data, plus import and backup for admins.
definePageMeta({ layout: 'console', section: 'data' })
useHead({ title: 'Festival data' })
const auth = useAdminAuth()
</script>

<template>
  <AdminDataHome v-if="auth.profile" :profile="auth.profile" />
</template>
