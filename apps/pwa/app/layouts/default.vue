<script setup lang="ts">
import { onMounted } from 'vue'
import { dataVersion } from '@afriff/core/published'
import { testSwitch } from '@afriff/core/utils/now'

// The attendee app's frame, laid out like the original React app: sponsor
// ribbon, header + urgent alert, the page and the bottom bar (the install
// toast is in app.vue, so it stays on pages without this frame too).
// Pages put their content in <div class="page">.
// First open: on an iPhone in the browser, the install steps come first
// (InstallFirst); then the welcome cards; then the app.
const welcomeOpen = useState('welcome-open', () => false)
onMounted(() => {
  try {
    welcomeOpen.value = testSwitch('welcome') === '1' || localStorage.getItem('afriff-welcome-seen') !== '1'
  } catch {
    welcomeOpen.value = false // storage blocked (private mode): don't nag every visit
  }
})

// iPhone / iPad in the browser (not the Home Screen app): install first.
// "Continue on the web" closes it until the app is fully reloaded, the same
// rule as the Android install toast (useInstallApp().dismissed).
const install = useInstallApp()
const installFirstOpen = useState('install-first-open', () => false)
watchEffect(() => {
  installFirstOpen.value = !install.dismissed.value && (install.method.value === 'ios' || testSwitch('install') === 'ios')
})
</script>

<template>
  <div class="app">
    <a href="#main" class="sr-only z-[60] rounded-full bg-accent px-4 py-2 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
      Skip to content
    </a>
    <!-- key: when newly published festival data arrives, everything redraws with it -->
    <div :key="dataVersion">
      <SponsorMarquee variant="ribbon" />
      <!-- header + urgent alert stay at the top together while scrolling -->
      <div class="app-top">
        <AppHeader />
        <AlertBanner />
      </div>
      <main id="main" class="main">
        <slot />
      </main>
    </div>
    <AppTabBar />
    <InstallFirst v-if="installFirstOpen" @web="install.dismiss()" />
    <WelcomeCards v-else-if="welcomeOpen" @done="welcomeOpen = false" />
  </div>
</template>
