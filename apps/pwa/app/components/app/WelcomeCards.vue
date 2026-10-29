<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { CheckIcon, DownloadIcon, EyeIcon, PlusIcon, StarIcon } from 'lucide-vue-next'
import { VENUES } from '@afriff/core/data/programme'

// First-open welcome cards. Shown once; remembered on this phone.
// Test it again: add ?welcome=1 to the address.
const emit = defineEmits<{ done: [] }>()
const KEY = 'afriff-welcome-seen'

const CARDS = [
  { art: 'now', title: 'The whole festival, in your pocket', text: 'Every film, screening and venue of AFRIFF 15, with what\'s on right now.' },
  { art: 'plan', title: 'Plan your days', text: 'Tap + on any screening to build your own festival schedule.' },
  { art: 'queue', title: 'Check the queue before you go', text: 'See how many people are waiting and how many seats are left at each screening.' },
  { art: 'seen', title: 'Log what you\'ve seen', text: 'Tap Seen it after a film, rate it, and export your list to Letterboxd.' },
  { art: 'share', title: 'Share your day on WhatsApp', text: 'Send your plan for the day to friends in one tap.' },
]
const dot = (i: number) => VENUES[i % VENUES.length]?.color || '#DBA440'

const track = useTemplateRef<HTMLElement>('track')
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
  if (!el) return
  el.scrollTo({ left: (index.value + 1) * el.clientWidth, behavior: 'smooth' })
}

let prev = ''
onMounted(() => { prev = document.body.style.overflow; document.body.style.overflow = 'hidden' })
onBeforeUnmount(() => { document.body.style.overflow = prev })
</script>

<template>
  <div class="wc" role="dialog" aria-modal="true" aria-label="Welcome to AFRIFF">
    <div class="wc-top">
      <span class="brand"><BrandEmblem :size="32" /> <span>AFRIFF</span></span>
      <button v-if="index < CARDS.length - 1" type="button" class="wc-skip" @click="finish">Skip</button>
    </div>

    <div ref="track" class="wc-track" @scroll.passive="onScroll">
      <section v-for="(c, i) in CARDS" :key="c.title" class="wc-slide" :aria-hidden="i !== index">
        <div class="wc-art">
          <!-- Small illustrations: mini mock-ups of the app, drawn in code -->
          <div v-if="c.art === 'now'" class="wc-card">
            <div class="wc-eyebrow"><span class="wc-live" /> NOW SHOWING</div>
            <div v-for="([t, w], r) in ([['4:00', 72], ['6:30', 56], ['7:00', 84], ['9:00', 64]] as [string, number][])" :key="t" class="wc-row">
              <span class="wc-time">{{ t }}</span>
              <span class="wc-bars"><i :style="{ width: `${w}%` }" /><i class="short" :style="{ width: `${w - 25}%` }" /></span>
              <VenueDot :color="dot(r)" :size="10" />
            </div>
          </div>
          <div v-else-if="c.art === 'plan'" class="wc-card">
            <div class="wc-eyebrow gold">SUN 1 NOV</div>
            <div v-for="(added, r) in [true, true, false]" :key="r" class="wc-row">
              <span class="wc-time">{{ ['1:30', '4:00', '7:00'][r] }}</span>
              <span class="wc-bars"><i :style="{ width: `${[70, 58, 80][r]}%` }" /><i class="short" style="width: 40%" /></span>
              <span class="wc-round" :class="{ on: added }"><CheckIcon v-if="added" :size="14" :stroke-width="3" /><PlusIcon v-else :size="14" /></span>
            </div>
          </div>
          <div v-else-if="c.art === 'queue'" class="wc-card">
            <div class="wc-eyebrow">IN LINE</div>
            <div class="wc-big">42</div>
            <div class="wc-seats">
              <i v-for="s in 24" :key="s" :class="{ free: (s - 1) % 5 === 3 || s - 1 > 19 }" />
            </div>
            <div class="wc-label">Good chance of a seat</div>
          </div>
          <div v-else-if="c.art === 'seen'" class="wc-card">
            <div class="wc-posters">
              <span v-for="(col, r) in ['#E0479E', '#2FB5C9', '#E8C04A']" :key="col" class="wc-poster" :style="{ background: `linear-gradient(160deg, ${col}, #160b2a)` }">
                <span class="wc-seen" :class="{ on: r < 2 }"><CheckIcon v-if="r < 2" :size="12" :stroke-width="3" /><EyeIcon v-else :size="12" /></span>
              </span>
            </div>
            <div class="wc-stars"><StarIcon v-for="n in 5" :key="n" :size="18" :fill="n <= 4 ? 'currentColor' : 'none'" /></div>
            <div class="wc-pill"><DownloadIcon :size="14" /> Export to Letterboxd</div>
          </div>
          <div v-else class="wc-card wc-chat">
            <div class="wc-bubble">
              <strong>My AFRIFF day, Sun 1 Nov:</strong>
              <span>• 1:30 PM: It's the Blackness</span>
              <span>• 7:00 PM: Lady (Opening Night)</span>
              <span class="wc-tick">✓✓</span>
            </div>
          </div>
        </div>
        <h2 class="wc-title">{{ c.title }}</h2>
        <p class="wc-text">{{ c.text }}</p>
      </section>
    </div>

    <div class="wc-bottom">
      <div class="wc-dots" :aria-label="`Card ${index + 1} of ${CARDS.length}`">
        <span v-for="(c, i) in CARDS" :key="c.title" :class="{ on: i === index }" />
      </div>
      <button type="button" class="btn btn-gold wc-next" @click="next">{{ index === CARDS.length - 1 ? 'Get started' : 'Next' }}</button>
    </div>
  </div>
</template>
