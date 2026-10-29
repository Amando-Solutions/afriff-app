<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { DownloadIcon, XIcon } from 'lucide-vue-next'

/**
 * The install toast (logic in useInstallApp, from @afriff/pwa), for Android /
 * Chrome / Edge: "Install the AFRIFF app" → the browser's own install dialog.
 * iPhones get the install-first screen's steps instead (InstallFirst.vue).
 * It's in app.vue, so it stays put while people move between pages: above the
 * bottom bar, or near the bottom edge on pages without one. Not shown on the
 * sign-up page, or on top of the first-open welcome cards.
 * ✕, "Not now", "Cancel" in Chrome's dialog or swiping it away (sideways or
 * down) closes it until the app is fully reloaded; then it asks again.
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

const show = computed(() =>
  install.method.value === 'prompt'
  && !install.dismissed.value && !onSignUp.value && !welcomeOpen.value && !installFirstOpen.value,
)

const busy = ref(false)
async function run() {
  busy.value = true
  try {
    if ((await install.install()) === 'dismissed') install.dismiss()
  } finally {
    busy.value = false
  }
}

// Swipe to close: the card follows the finger sideways (either way) or down.
// Let go far enough, or flick it, and it slides off; otherwise it springs back.
const CLOSE_PX = 60
const FLICK_PX = 16
const FLICK_PX_PER_MS = 0.4
const SLIDE_MS = 200
const card = ref<HTMLElement | null>(null)
const drag = reactive({ x: 0, y: 0, moving: false, moved: false, leaving: false })
let start: { x: number, y: number, t: number, id: number } | null = null
let axis: 'x' | 'y' = 'x'
let dragged = false
let settle: ReturnType<typeof setTimeout> | undefined

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0 || drag.leaving) return
  start = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId }
  dragged = false
}

function onPointerMove(e: PointerEvent) {
  if (!start || e.pointerId !== start.id) return
  const dx = e.clientX - start.x
  const dy = e.clientY - start.y
  if (!drag.moving) {
    if (Math.hypot(dx, dy) < 8) return // still a tap
    axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
    clearTimeout(settle)
    dragged = drag.moving = drag.moved = true
    card.value?.setPointerCapture(e.pointerId)
  }
  if (axis === 'x') drag.x = dx
  else drag.y = dy > 0 ? dy : dy / 5 // pulled up: it resists
}

function onPointerUp(e: PointerEvent) {
  if (!start || e.pointerId !== start.id) return
  const ms = Math.max(1, e.timeStamp - start.t)
  start = null
  if (!drag.moving) return
  drag.moving = false
  const dist = axis === 'x' ? Math.abs(drag.x) : drag.y
  if (dist >= CLOSE_PX || (dist >= FLICK_PX && dist / ms >= FLICK_PX_PER_MS)) slideAway()
  else springBack()
}

function springBack() {
  start = null
  drag.moving = false
  drag.x = 0
  drag.y = 0
  settle = setTimeout(() => { drag.moved = false }, SLIDE_MS)
}

function slideAway() {
  drag.leaving = true
  if (axis === 'x') drag.x = Math.sign(drag.x) * ((card.value?.offsetWidth ?? 400) + 32)
  else drag.y = (card.value?.offsetHeight ?? 160) + 96
  setTimeout(() => install.dismiss(), SLIDE_MS)
}

function resetDrag() {
  Object.assign(drag, { x: 0, y: 0, moving: false, moved: false, leaving: false })
}

// a drag that began on a button isn't a tap on it
function onClickCapture(e: MouseEvent) {
  if (!dragged) return
  dragged = false
  e.stopPropagation()
  e.preventDefault()
}

const cardStyle = computed(() => {
  if (!drag.moved) return undefined // no inline transition, so the enter / leave animation works
  const away = axis === 'x'
    ? Math.abs(drag.x) / (card.value?.offsetWidth || 400)
    : Math.max(0, drag.y) / 200
  return {
    transform: `translate3d(${drag.x}px, ${drag.y}px, 0)`,
    opacity: String(Math.max(0, 1 - away)),
    transition: drag.moving ? 'none' : `transform ${SLIDE_MS}ms cubic-bezier(0.23, 1, 0.32, 1), opacity ${SLIDE_MS}ms ease-out`,
  }
})
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
    :class="aboveTabBar ? 'bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]' : 'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]'"
    aria-live="polite"
  >
    <Transition
      enter-active-class="transition-[opacity,translate] duration-300 ease-out"
      enter-from-class="translate-y-3 opacity-0"
      leave-active-class="transition-[opacity,translate] duration-150 ease-out"
      leave-to-class="translate-y-2 opacity-0"
      @after-leave="resetDrag"
    >
      <div
        v-if="show"
        ref="card"
        class="pointer-events-auto flex w-full max-w-md touch-none items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-pop select-none"
        :style="cardStyle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="springBack"
        @click.capture="onClickCapture"
      >
        <AppLogo :show-wordmark="false" />
        <div class="flex-1">
          <p class="font-semibold">Install the AFRIFF app</p>
          <p class="mt-0.5 text-meta text-muted">One tap from your home screen, and it works without data.</p>
          <div class="mt-3 flex gap-2">
            <UiButton size="sm" :disabled="busy" @click="run">
              <DownloadIcon aria-hidden="true" />
              Install
            </UiButton>
            <UiButton size="sm" variant="ghost" @click="install.dismiss()">Not now</UiButton>
          </div>
        </div>
        <button type="button" class="pressable -m-1 grid size-8 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink" aria-label="Dismiss" @click="install.dismiss()">
          <XIcon class="size-4" />
        </button>
      </div>
    </Transition>
  </div>
</template>
