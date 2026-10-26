<script setup lang="ts">
import { computed } from 'vue'
import { COLLECTIONS, isCollection } from '~/lib/schema'

// /admin/data/<collection>: the list of one kind of data (films, screenings…).
definePageMeta({ layout: 'console', section: 'data' })
const route = useRoute()
const col = computed(() => {
  const c = String(route.params.col)
  if (!isCollection(c)) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
  return c
})
useHead({ title: () => COLLECTIONS[col.value].title })
</script>

<template>
  <AdminDataList :key="col" :col="col" />
</template>
