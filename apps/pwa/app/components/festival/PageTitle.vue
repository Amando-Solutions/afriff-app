<script setup lang="ts">
import type { Component } from 'vue'
// Big capitals page title with its gold icon after it (PROGRAMME, MY SCHEDULE…).
withDefaults(defineProps<{ title: string; icon?: Component | null }>(), { icon: null })
</script>

<template>
  <h1 class="page-title">
    {{ title }}
    <component :is="icon" v-if="icon" :size="26" :stroke-width="1.8" class="page-title-icon" />
  </h1>
</template>
