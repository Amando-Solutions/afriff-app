<script setup lang="ts">
// "/" (where the installed staff app opens). Nobody stays here: the
// middleware sends people on (signed out → /login, door volunteers → /door,
// everyone else → /admin). See lib/access.ts.
useHead({ title: 'AFRIFF Staff' })
</script>

<template>
  <div class="grid min-h-dvh place-items-center">
    <AppLogo :show-wordmark="false" :size="40" />
  </div>
</template>
