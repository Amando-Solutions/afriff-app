<script setup>
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { CheckIcon, DownloadIcon, EyeIcon, PlusIcon, StarIcon } from 'lucide-vue-next'
import { VENUES } from '~/data/programme.js'

// First-open welcome cards. Shown once; remembered on this phone.
// Test it again: add ?welcome=1 to the address.
const emit = defineEmits(['done'])
const KEY = 'afriff-welcome-seen'

const CARDS = [
  { art: 'now', title: 'The whole festival, in your pocket', text: 'Every film, screening and venue of AFRIFF 15, with what\'s on right now.' },
  { art: 'plan', title: 'Plan your days', text: 'Tap + on any screening to build your own festival schedule.' },
  { art: 'queue', title: 'Check the queue before you go', text: 'See how many people are waiting and how many seats are left at each screening.' },
  { art: 'seen', title: 'Log what you\'ve seen', text: 'Tap Seen it after a film, rate it, and export your list to Letterboxd.' },
  { art: 'share', title: 'Share your day on WhatsApp', text: 'Send your plan for the day to friends in one tap.' },
]
const dot = (i) => VENUES[i % VENUES.length]?.color || '#D9A441'

const track = useTemplateRef('track')
const index = ref(0)

function finish() {
  try { localStorage.setItem(KEY, '1') } catch { /* storage blocked: nothing to do */ }
  emit('done')
}
// keep the dots in step with swiping
function onScroll() {
  const el = track.value
  if (!el) return
  const i = Math.round(el.scrollLeft / el.clientWidth)
  if (i !== index.value) index.value = i
}
function next() {
  if (index.value === CARDS.length - 1) return finish()
  const el = track.value
  el.scrollTo({ left: (index.value + 1) * el.clientWidth, behavior: 'smooth' })
}

let prev = ''
onMounted(() => { prev = document.body.style.overflow; document.body.style.overflow = 'hidden' })
onBeforeUnmount(() => { document.body.style.overflow = prev })
</script>

<template>
  <div class="pt-safe pb-safe fixed inset-0 z-[70] flex flex-col bg-canvas" role="dialog" aria-modal="true" aria-label="Welcome to AFRIFF">
    <div class="mx-auto flex w-full max-w-xl items-center justify-between px-5 py-3.5">
      <AppLogo />
      <button v-if="index < CARDS.length - 1" type="button" class="px-1 py-2 text-meta font-semibold text-muted" @click="finish">Skip</button>
    </div>

    <div ref="track" class="scrollbar-none mx-auto flex w-full max-w-xl flex-1 snap-x snap-mandatory overflow-x-auto" @scroll.passive="onScroll">
      <section
        v-for="(c, i) in CARDS"
        :key="c.title"
        class="flex w-full shrink-0 snap-center flex-col px-6 pb-4"
        :aria-hidden="i !== index"
      >
        <div class="flex w-full flex-1 items-center justify-center">
          <!-- Small illustrations: mini mock-ups of the app, drawn in code -->
          <div class="card w-full max-w-[18.5rem] p-4 shadow-pop max-[380px]:scale-90">
            <template v-if="c.art === 'now'">
              <div class="mb-2 flex items-center gap-2 text-micro font-semibold tracking-[0.14em] text-muted"><span class="pulse text-success" /> NOW SHOWING</div>
              <div v-for="([t, w], r) in [['4:00', 72], ['6:30', 56], ['7:00', 84], ['9:00', 64]]" :key="t" class="flex items-center gap-3.5 py-2">
                <span class="w-10 font-display font-semibold text-accent-ink tabular-nums">{{ t }}</span>
                <span class="flex flex-1 flex-col gap-1.5"><i class="block h-2 rounded-full bg-ink/85" :style="{ width: `${w}%` }" /><i class="block h-1.5 rounded-full bg-muted/45" :style="{ width: `${w - 25}%` }" /></span>
                <VenueDot :color="dot(r)" :size="10" />
              </div>
            </template>
            <template v-else-if="c.art === 'plan'">
              <div class="mb-2 text-micro font-semibold tracking-[0.14em] text-accent-ink">SUN 1 NOV</div>
              <div v-for="(added, r) in [true, true, false]" :key="r" class="flex items-center gap-3.5 py-2">
                <span class="w-10 font-display font-semibold text-accent-ink tabular-nums">{{ ['1:30', '4:00', '7:00'][r] }}</span>
                <span class="flex flex-1 flex-col gap-1.5"><i class="block h-2 rounded-full bg-ink/85" :style="{ width: `${[70, 58, 80][r]}%` }" /><i class="block h-1.5 w-2/5 rounded-full bg-muted/45" /></span>
                <span class="grid size-7 place-items-center rounded-full border" :class="added ? 'border-accent bg-accent text-on-accent' : 'border-line bg-raised'">
                  <CheckIcon v-if="added" class="size-3.5" :stroke-width="3" /><PlusIcon v-else class="size-3.5" />
                </span>
              </div>
            </template>
            <template v-else-if="c.art === 'queue'">
              <div class="text-micro font-semibold tracking-[0.14em] text-muted">IN LINE</div>
              <div class="font-display text-[4rem] leading-none font-semibold tracking-tight text-accent-ink">42</div>
              <div class="my-4 grid grid-cols-8 gap-1.5">
                <i v-for="s in 24" :key="s" class="block h-3.5 rounded" :class="(s - 1) % 5 === 3 || s > 20 ? 'bg-success/85' : 'bg-raised'" />
              </div>
              <div class="text-meta font-semibold text-success">Good chance · 63 seats left</div>
            </template>
            <template v-else-if="c.art === 'seen'">
              <div class="flex gap-2.5">
                <span v-for="(col, r) in ['#E0479E', '#2FB5C9', '#E8C04A']" :key="col" class="relative aspect-[2/3] flex-1 rounded-tile" :style="{ background: `linear-gradient(160deg, ${col}, #160b2a)` }">
                  <span class="absolute right-1.5 bottom-1.5 grid size-6 place-items-center rounded-full" :class="r < 2 ? 'bg-accent text-on-accent' : 'bg-navy-950/80 text-ink'">
                    <CheckIcon v-if="r < 2" class="size-3" :stroke-width="3" /><EyeIcon v-else class="size-3" />
                  </span>
                </span>
              </div>
              <div class="my-3.5 flex gap-1 text-accent-ink"><StarIcon v-for="n in 5" :key="n" class="size-[1.125rem]" :fill="n <= 4 ? 'currentColor' : 'none'" /></div>
              <div class="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-label font-semibold text-on-accent"><DownloadIcon class="size-3.5" /> Export to Letterboxd</div>
            </template>
            <template v-else>
              <div class="ml-auto flex max-w-[15rem] flex-col gap-1 rounded-tile rounded-tr-sm bg-[#103529] p-3 text-meta">
                <strong class="font-semibold">My AFRIFF day, Sun 1 Nov:</strong>
                <span>• 1:30 PM: It's the Blackness</span>
                <span>• 7:00 PM: Lady (Opening Night)</span>
                <span class="self-end text-micro text-[#8FD3FF]">✓✓</span>
              </div>
            </template>
          </div>
        </div>
        <h2 class="mt-6 max-w-[20rem] font-display text-display font-semibold max-[380px]:text-h1">{{ c.title }}</h2>
        <p class="mt-3 max-w-[20rem] text-prose text-muted">{{ c.text }}</p>
      </section>
    </div>

    <div class="mx-auto w-full max-w-xl px-5 pt-3 pb-5">
      <div class="mb-4 flex justify-center gap-1.5" :aria-label="`Card ${index + 1} of ${CARDS.length}`">
        <span v-for="(c, i) in CARDS" :key="c.title" class="h-1.5 rounded-full transition-[width,background-color] duration-200" :class="i === index ? 'w-6 bg-accent' : 'w-1.5 bg-line-strong'" />
      </div>
      <UiButton size="lg" block @click="next">{{ index === CARDS.length - 1 ? 'Get started' : 'Next' }}</UiButton>
    </div>
  </div>
</template>
