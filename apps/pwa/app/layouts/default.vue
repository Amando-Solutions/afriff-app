<script setup lang="ts">
import { onMounted } from 'vue'
import { dataVersion } from '@afriff/core/published'
import { testSwitch } from '@afriff/core/utils/now'

// The attendee app's frame: sponsor ribbon, header, offline banner, the page,
// the bottom bar, and the install / update toasts.
const welcomeOpen = useState('welcome-open', () => false)
onMounted(() => {
  try {
    welcomeOpen.value = testSwitch('welcome') === '1' || localStorage.getItem('afriff-welcome-seen') !== '1'
  } catch {
    welcomeOpen.value = false // storage blocked (private mode): don't nag every visit
  }
})
</script>

<template>
  <div class="min-h-dvh">
    <a href="#main" class="sr-only z-[60] rounded-full bg-accent px-4 py-2 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
      Skip to content
    </a>
    <!-- key: when newly published festival data arrives, everything redraws with it -->
    <div :key="dataVersion">
      <SponsorMarquee variant="ribbon" />
      <AppHeader />
      <AppOfflineBanner message="You’re offline. The programme and your plan still work." />
      <main id="main" class="mx-auto w-full max-w-xl px-4 pt-5 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]">
        <slot />
      </main>
    </div>
    <AppTabBar />
    <AppPwaPrompts />
    <WelcomeCards v-if="welcomeOpen" @done="welcomeOpen = false" />
  </div>
</template>
