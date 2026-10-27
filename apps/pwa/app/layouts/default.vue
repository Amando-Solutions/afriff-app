<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { dataVersion } from '@afriff/core/published'
import { testSwitch } from '@afriff/core/utils/now'

// The attendee app's frame, laid out like the original React app: sponsor
// ribbon, header, offline banner, the page, the bottom bar, and the install /
// update toasts. Pages put their content in <div class="page">.
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

// iPhone / iPad in the browser (not the Home Screen app): install first,
// until they choose "Continue on the web" (remembered in this browser).
const WEB_KEY = 'afriff-ios-web'
const install = useInstallApp()
const onWeb = ref((() => {
  try { return localStorage.getItem(WEB_KEY) === '1' } catch { return false }
})())
const installFirstOpen = useState('install-first-open', () => false)
watchEffect(() => {
  installFirstOpen.value = !onWeb.value && (install.method.value === 'ios' || testSwitch('install') === 'ios')
})
function continueOnWeb() {
  onWeb.value = true
  try { localStorage.setItem(WEB_KEY, '1') } catch { /* blocked: asked again next visit */ }
  install.snooze() // and no "Add to Home Screen" toast straight after
}
</script>

<template>
  <div class="app">
    <a href="#main" class="sr-only z-[60] rounded-full bg-accent px-4 py-2 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
      Skip to content
    </a>
    <!-- key: when newly published festival data arrives, everything redraws with it -->
    <div :key="dataVersion">
      <SponsorMarquee variant="ribbon" />
      <AppHeader />
      <main id="main" class="main">
        <slot />
      </main>
    </div>
    <AppTabBar />
    <AppPwaPrompts />
    <InstallFirst v-if="installFirstOpen" @web="continueOnWeb" />
    <WelcomeCards v-else-if="welcomeOpen" @done="welcomeOpen = false" />
  </div>
</template>
