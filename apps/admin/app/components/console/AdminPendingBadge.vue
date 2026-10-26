<script setup lang="ts">
import { useChanges } from '~/lib/data'

const changes = useChanges({ pendingOnly: true })
</script>

<template>
  <UiBadge v-if="changes.items?.length" tone="accent">{{ changes.items.length }} waiting</UiBadge>
</template>
