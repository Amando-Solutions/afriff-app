<script setup lang="ts">
import { watchEffect } from 'vue'
import { useAdminAuth } from '~/admin/useAdminAuth'

// The installed app opens here. Door volunteers go straight to their door
// view; everyone else (and anyone not signed in yet) to the console, which
// shows the sign-in screen when needed.
useHead({ title: 'AFRIFF Staff', meta: [{ name: 'robots', content: 'noindex' }] })
const auth = useAdminAuth()
watchEffect(() => {
  if (auth.loading) return
  void navigateTo(auth.profile?.role === 'volunteer' ? '/door' : '/admin', { replace: true })
})
</script>

<template>
  <div class="grid min-h-dvh place-items-center">
    <AppLogo :show-wordmark="false" :size="40" />
  </div>
</template>
