<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

// iPhone and iPad, in the browser: the first thing shown is how to add AFRIFF
// to the Home Screen, with "Continue on the web" under it. Same approach as
// DP Fitness (DPfitPWA: pages/access-code.vue "installFirst" +
// components/pwa/InstallAppSteps.vue).
//
// Why first on iPhone: the Home Screen app keeps its own storage, separate
// from Safari's, so a sign-up or a plan made in Safari doesn't come along.
// Installed first, everything happens in the app. Nothing here can install
// (iOS keeps that in the Share sheet), so the one button is the way past.
// Shown by layouts/default.vue; "Continue on the web" closes it until the
// next full reload.
// Test it on a laptop: add ?install=ios to the address.
const emit = defineEmits<{ web: [] }>()

let prev = ''
onMounted(() => { prev = document.body.style.overflow; document.body.style.overflow = 'hidden' })
onBeforeUnmount(() => { document.body.style.overflow = prev })
</script>

<template>
  <div class="wc" role="dialog" aria-modal="true" aria-labelledby="install-first-title">
    <div class="wc-top">
      <span class="brand"><BrandEmblem :size="32" /> <span>AFRIFF</span></span>
    </div>

    <div class="if-body">
      <img src="/pwa-192x192.png" alt="" width="84" height="84" class="if-app-icon">
      <h1 id="install-first-title" class="wc-title">Install the app first</h1>
      <p class="wc-text">Add AFRIFF to your Home Screen. It opens like an app, and the programme and your plan work with no signal.</p>
      <InstallSteps />
    </div>

    <div class="wc-bottom">
      <p class="if-already">Already added it? Open AFRIFF from your Home Screen.</p>
      <button type="button" class="btn btn-outline wc-next" @click="emit('web')">Continue on the web</button>
    </div>
  </div>
</template>
