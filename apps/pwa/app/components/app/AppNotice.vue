<script setup lang="ts">
import { WifiOffIcon, XIcon } from 'lucide-vue-next'
import { dismissNotice, notice } from '~/lib/notice'

// The message from lib/notice.ts: a small card just above the bottom bar,
// where the thumb that tapped is. Goes away by itself after a few seconds.
</script>

<template>
  <div class="notice-wrap" aria-live="polite">
    <Transition name="notice" mode="out-in">
      <div v-if="notice.title" :key="notice.id" class="notice" role="status">
        <span class="notice-icon" aria-hidden="true"><WifiOffIcon :size="18" :stroke-width="2" /></span>
        <span class="notice-text">
          <strong>{{ notice.title }}</strong>
          <span>{{ notice.text }}</span>
        </span>
        <button type="button" class="notice-close" aria-label="Close message" @click="dismissNotice"><XIcon :size="16" /></button>
      </div>
    </Transition>
  </div>
</template>
