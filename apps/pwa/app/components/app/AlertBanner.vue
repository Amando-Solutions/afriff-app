<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import { TriangleAlertIcon, XIcon } from 'lucide-vue-next'
import { dataVersion } from '@afriff/core/published'
import { activeBanner, newsLink } from '~/lib/alerts'
import { useLiveClock } from '~/lib/queues'

// The urgent alert (newest urgent news item before its "show until" time),
// stuck under the header on every page of the app frame (layouts/default.vue),
// so it stays put while people move between pages and scroll. Same look as the
// old Home banner, cut to two lines. Tap → the screening or event it's about,
// else News. Not on News itself (it's the top item there). ✕ hides that alert
// on this phone for good; a newer alert still shows. While it shows it sets
// --alert-bar to its height, so in-page jumps (the film page's "N screenings")
// stop below it.
const CLOSED_KEY = 'afriff-banner-closed'

function readClosed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLOSED_KEY) || '[]')
  } catch {
    return []
  }
}

const route = useRoute()
const t = useLiveClock(60000) // its "show until" time passes
const closed = ref(readClosed())

const alert = computed(() => {
  void t.value
  void dataVersion.value // newly published news
  const a = activeBanner()
  return a && !closed.value.includes(a.id) ? a : null
})
const link = computed(() => (alert.value ? newsLink(alert.value) : null))
const title = computed(() => {
  const text = alert.value?.title || ''
  return /[.!?:]$/.test(text) ? text : `${text}.`
})
const shown = computed(() => Boolean(alert.value) && route.path !== '/news')

function close() {
  if (!alert.value) return
  closed.value = [...closed.value, alert.value.id].slice(-20)
  try {
    localStorage.setItem(CLOSED_KEY, JSON.stringify(closed.value))
  } catch {
    /* storage blocked: closed until the app is reloaded */
  }
}

const el = ref<HTMLElement | null>(null)
const { height } = useElementSize(el, undefined, { box: 'border-box' })
watch([shown, height], ([on, h]) => {
  document.documentElement.style.setProperty('--alert-bar', on ? `${Math.round(h)}px` : '0px')
}, { immediate: true })
</script>

<template>
  <div v-if="shown && alert" ref="el" class="alert-wrap">
    <div class="news-banner" role="status">
      <TriangleAlertIcon :size="20" class="news-banner-icon" />
      <NuxtLink :to="link?.href || '/news'" class="news-banner-text">
        <strong>{{ title }}</strong> {{ alert.body }}
      </NuxtLink>
      <button type="button" class="icon-btn" aria-label="Dismiss" @click="close">
        <XIcon :size="18" />
      </button>
    </div>
  </div>
</template>
