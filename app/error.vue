<script setup>
import { CompassIcon } from 'lucide-vue-next'

// Shown for addresses that don't exist (and anything that breaks badly).
const props = defineProps({ error: { type: Object, default: null } })
const notFound = props.error?.statusCode === 404
useHead({ title: notFound ? 'Page not found' : 'Something went wrong' })
</script>

<template>
  <NuxtLayout>
    <UiEmptyState
      :icon="CompassIcon"
      :title="notFound ? 'We couldn’t find that page' : 'Something went wrong'"
      :description="notFound ? 'The link may be old, or the page has moved.' : 'Try again in a moment.'"
    >
      <UiButton @click="clearError({ redirect: '/' })">Back to Home</UiButton>
    </UiEmptyState>
  </NuxtLayout>
</template>
