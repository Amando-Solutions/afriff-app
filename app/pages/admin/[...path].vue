<script setup>
import { computed } from 'vue'
import AdminApp from '~/admin/AdminApp.vue'

// The admin console. This page (and Firebase with it) is only downloaded when
// someone opens /admin, so attendees' phones never load it.
definePageMeta({ layout: 'admin' })
useHead({ title: 'Admin', meta: [{ name: 'robots', content: 'noindex' }] })
const route = useRoute()
const path = computed(() => (Array.isArray(route.params.path) ? route.params.path : [route.params.path]).filter(Boolean))
</script>

<template>
  <AdminApp :path="path" />
</template>
