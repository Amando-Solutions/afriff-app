<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { BellRingIcon, CheckIcon, DownloadIcon } from 'lucide-vue-next'
import { testSwitch } from '@afriff/core/utils/now'
import { browserCanPush, pushConfigured, pushState, turnOnAlerts } from '~/lib/push'

/**
 * The cards at the bottom of every page, one at a time (in app.vue, so they
 * stay put while people move between pages: above the bottom bar, or near the
 * bottom edge on pages without one). Not shown on the sign-up page, or on top
 * of the first-open welcome cards or the iPhone install-first screen.
 * ✕, "Not now" or swiping it away (sideways or down, SwipeCard.vue) closes a
 * card until the app is fully reloaded; then it asks again.
 *
 * 1. "Install the AFRIFF app" (logic in useInstallApp, from @afriff/pwa), for
 *    Android / Chrome / Edge: the browser's own install dialog ("Cancel" there
 *    closes it too). iPhones get the install-first screen's steps instead
 *    (InstallFirst.vue). First, because installing is what we want people to
 *    do first.
 * 2. "Turn on alerts": the same alerts as the switch on Profile and News
 *    (lib/push.ts). Where the switch works (Android browsers, the iPhone Home
 *    Screen app; not iPhone Safari, where the install-first screen says how),
 *    and only while this phone has never been asked: someone who said no, or
 *    turned alerts off in Profile, isn't asked again.
 * Chrome makes its install offer a moment after the page loads, so the alerts
 * card waits a few seconds before it shows, and an alerts card nobody has
 * tapped yet still gives way to the install toast if the offer comes later.
 * Once "Turn on" is tapped it stays, to say how that went.
 *
 * There's no "new version ready" toast any more: a new version installs by
 * itself and the app reloads onto it when it's next reopened
 * (plugins/sw-update.client.ts).
 */
const install = useInstallApp()
const welcomeOpen = useState('welcome-open', () => false)
// the install-first screen (layouts/default.vue; ?install=ios on a laptop) says it all already
const installFirstOpen = useState('install-first-open', () => false)
const route = useRoute()
// the sign-up form needs the whole screen (user decision 28 Oct)
const onSignUp = computed(() => route.path === '/auth')
// privacy and VIP-link pages have their own frame, with no bottom bar
const aboveTabBar = computed(() => route.meta.layout !== false)
const hidden = computed(() => onSignUp.value || welcomeOpen.value || installFirstOpen.value)

const alertsPossible = computed(() =>
  pushConfigured() && browserCanPush() && install.method.value !== 'ios' && testSwitch('install') !== 'ios',
)
const alertsClosed = ref(false)
// turned on from this card: it stays up to say how that went
const alertsTapped = ref(false)
const alertsDone = ref(false)
// time for Chrome's install offer to arrive, so the install toast usually comes
// first without the alerts card showing and then swapping for it
const ALERTS_WAIT_MS = 3000
const alertsWaited = ref(false)

const wanted = {
  install: computed(() => install.method.value === 'prompt' && !install.dismissed.value),
  alerts: computed(() => alertsPossible.value && alertsWaited.value && !alertsClosed.value
    && (alertsTapped.value || (!pushState.on && pushState.permission === 'default'))),
}
type Prompt = keyof typeof wanted
const current = ref<Prompt | null>(null)
watchEffect(() => {
  if (current.value === 'alerts' && alertsTapped.value && wanted.alerts.value) return
  current.value = wanted.install.value ? 'install' : wanted.alerts.value ? 'alerts' : null
})

let waitTimer: ReturnType<typeof setTimeout> | undefined
let doneTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  waitTimer = setTimeout(() => { alertsWaited.value = true }, ALERTS_WAIT_MS)
})
function closeAlerts() {
  clearTimeout(doneTimer)
  alertsClosed.value = true
}
onBeforeUnmount(() => {
  clearTimeout(waitTimer)
  clearTimeout(doneTimer)
})

// straight from the tap: browsers only ask for permission in answer to one
async function turnOn() {
  alertsTapped.value = true
  await turnOnAlerts()
  if (!pushState.on) return
  alertsDone.value = true
  doneTimer = setTimeout(closeAlerts, 3500)
}

const installing = ref(false)
async function runInstall() {
  installing.value = true
  try {
    if ((await install.install()) === 'dismissed') install.dismiss()
  } finally {
    installing.value = false
  }
}

function close() {
  if (current.value === 'alerts') closeAlerts()
  else install.dismiss()
}
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
    :class="aboveTabBar ? 'bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]' : 'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]'"
    aria-live="polite"
  >
    <SwipeCard :show="current !== null && !hidden" :card-key="current ?? undefined" @dismiss="close">
      <template v-if="current === 'alerts' && alertsDone">
        <span class="grid size-7 shrink-0 place-items-center rounded-full bg-success-soft text-success" aria-hidden="true">
          <CheckIcon class="size-4" />
        </span>
        <div class="flex-1" role="status">
          <p class="font-semibold">Alerts are on</p>
          <p class="mt-0.5 text-meta text-muted">We'll let you know when something changes. You can turn them off in Profile.</p>
        </div>
      </template>
      <template v-else-if="current === 'alerts'">
        <span class="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink" aria-hidden="true">
          <BellRingIcon class="size-4" />
        </span>
        <div class="flex-1">
          <p class="font-semibold">{{ pushState.permission === 'denied' ? 'Alerts are blocked' : 'Turn on alerts' }}</p>
          <template v-if="pushState.permission === 'denied'">
            <p class="mt-0.5 text-meta text-danger">Notifications are blocked for AFRIFF. To get alerts, allow them in your phone's settings, then turn alerts on in Profile.</p>
          </template>
          <template v-else>
            <p class="mt-0.5 text-meta text-muted">Know at once if a screening moves, is cancelled or sells out, and for big festival news.</p>
            <p v-if="pushState.error" class="mt-1.5 text-meta text-danger" role="alert">{{ pushState.error }}</p>
            <div class="mt-3 flex gap-2">
              <UiButton size="sm" :loading="pushState.busy" @click="turnOn">
                <BellRingIcon v-if="!pushState.busy" aria-hidden="true" />
                {{ pushState.error ? 'Try again' : 'Turn on' }}
              </UiButton>
              <UiButton size="sm" variant="ghost" @click="closeAlerts">Not now</UiButton>
            </div>
          </template>
        </div>
      </template>
      <template v-else>
        <AppLogo :show-wordmark="false" />
        <div class="flex-1">
          <p class="font-semibold">Install the AFRIFF app</p>
          <p class="mt-0.5 text-meta text-muted">One tap from your home screen, and it works without data.</p>
          <div class="mt-3 flex gap-2">
            <UiButton size="sm" :disabled="installing" @click="runInstall">
              <DownloadIcon aria-hidden="true" />
              Install
            </UiButton>
            <UiButton size="sm" variant="ghost" @click="install.dismiss()">Not now</UiButton>
          </div>
        </div>
      </template>
    </SwipeCard>
  </div>
</template>
