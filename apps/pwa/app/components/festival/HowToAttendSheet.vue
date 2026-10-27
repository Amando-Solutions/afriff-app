<script setup lang="ts">
import { ArrowUpRightIcon, NavigationIcon } from 'lucide-vue-next'
import { HOW_TO_ATTEND, SCREENINGS, VENUES } from '@afriff/core/data/programme'
import { directionsUrl } from '@afriff/core/utils/format'

// "How to attend" bottom sheet (opened from Home and Venues). Text is edited in the console.
const open = defineModel<boolean>('open', { default: false })
const count = (id: string) => SCREENINGS.filter((s) => s.venue === id).length
</script>

<template>
  <BottomSheet v-model:open="open" title="How to attend">
    <section v-for="s in HOW_TO_ATTEND" :key="s.id" class="hta-section">
      <h3 class="hta-head">{{ s.title }}</h3>
      <p class="hta-body">{{ s.body }}</p>
      <a v-if="s.link" class="link hta-link" :href="s.link.url" target="_blank" rel="noopener noreferrer">
        {{ s.link.label }} <ArrowUpRightIcon :size="16" />
      </a>
    </section>

    <h3 class="hta-head hta-venues-head">Venues</h3>
    <div v-for="v in VENUES" :key="v.id" class="hta-venue">
      <div class="hta-venue-text">
        <span class="hta-venue-name"><VenueDot :venue-id="v.id" :size="10" /> {{ v.name }}</span>
        <span class="muted small">{{ v.address }}</span>
        <span class="hta-venue-count">{{ count(v.id) }} screening{{ count(v.id) === 1 ? '' : 's' }}</span>
      </div>
      <a class="round-btn" :href="directionsUrl(v.address)" target="_blank" rel="noopener noreferrer" :aria-label="`Directions to ${v.name}`">
        <NavigationIcon :size="18" />
      </a>
    </div>
  </BottomSheet>
</template>
