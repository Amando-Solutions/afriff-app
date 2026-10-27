<script setup lang="ts">
import { computed } from 'vue'
import { COLLECTIONS, isCollection } from '~/lib/schema'
import { useAdminAuth } from '~/lib/useAdminAuth'

// /admin/data/<collection>/<id>, or /new: edit (or create) one item.
definePageMeta({ layout: 'console', section: 'data' })
const route = useRoute()
const auth = useAdminAuth()
const col = computed(() => {
  const c = String(route.params.col)
  if (!isCollection(c)) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
  return c
})
const id = computed(() => String(route.params.id))
useHead({ title: () => `${id.value === 'new' ? 'New' : 'Edit'} ${COLLECTIONS[col.value].single}` })
</script>

<template>
  <AdminItemForm v-if="auth.profile" :key="col + id" :col="col" :id="id" :profile="auth.profile" />
</template>
