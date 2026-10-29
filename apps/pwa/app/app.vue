<template>
  <!-- on every page: the "No internet connection" bar, short messages and the
       install toast (here, not in the layout, so moving between pages never
       hides or restarts it) -->
  <ConnectionStatus />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AppNotice />
  <AppPwaPrompts />
</template>
