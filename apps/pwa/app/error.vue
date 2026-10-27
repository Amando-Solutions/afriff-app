<script setup lang="ts">
import type { NuxtError } from '#app'

// Shown for addresses that don't exist (and anything that breaks badly).
const props = defineProps<{ error: NuxtError | null }>()
const notFound = props.error?.statusCode === 404
useHead({ title: notFound ? 'Page not found' : 'Something went wrong' })
</script>

<template>
  <NuxtLayout>
    <div class="page">
      <div class="empty-block">
        <h1 class="section-title">{{ notFound ? 'We couldn’t find that page' : 'Something went wrong' }}</h1>
        <p class="muted">{{ notFound ? 'The link may be old, or the page has moved.' : 'Try again in a moment.' }}</p>
        <button type="button" class="btn btn-gold btn-small" @click="clearError({ redirect: '/' })">Back to Home</button>
      </div>
    </div>
  </NuxtLayout>
</template>
