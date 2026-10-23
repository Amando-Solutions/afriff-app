<script setup>
import { useChanges } from './data.js'

const changes = useChanges({ pendingOnly: true })
</script>

<template>
  <UiBadge v-if="changes.items?.length" tone="accent">{{ changes.items.length }} waiting</UiBadge>
</template>
