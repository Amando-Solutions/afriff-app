<script setup lang="ts">
import { ArrowUpRightIcon, NavigationIcon } from 'lucide-vue-next'
import { HOW_TO_ATTEND, SCREENINGS, VENUES } from '~/data/programme'
import { directionsUrl } from '~/lib/format'

// "How to attend" bottom sheet (opened from Home and Venues). Text is edited in the console.
const open = defineModel<boolean>('open', { default: false })
const count = (id: string) => SCREENINGS.filter((s) => s.venue === id).length
</script>

<template>
  <UiSheet v-model:open="open" title="How to attend">
    <section v-for="s in HOW_TO_ATTEND" :key="s.id" class="border-b border-line py-4 first:pt-0">
      <h3 class="text-body font-semibold">{{ s.title }}</h3>
      <p class="mt-1 text-meta leading-relaxed text-muted">{{ s.body }}</p>
      <a v-if="s.link?.url" :href="s.link.url" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex items-center gap-1 text-meta font-medium text-accent-ink">
        {{ s.link.label }} <ArrowUpRightIcon class="size-4" />
      </a>
    </section>

    <h3 class="mt-5 mb-2 font-display text-h3 font-semibold">Venues</h3>
    <div v-for="v in VENUES" :key="v.id" class="flex items-center gap-3 border-b border-line py-3 last:border-0">
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="flex items-center gap-2 text-body font-semibold"><VenueDot :venue-id="v.id" :size="10" /> {{ v.name }}</span>
        <span class="text-label text-muted">{{ v.address }}</span>
        <span class="text-label text-muted">{{ count(v.id) }} screening{{ count(v.id) === 1 ? '' : 's' }}</span>
      </div>
      <a
        class="pressable grid size-10 shrink-0 place-items-center rounded-full border border-line bg-raised text-accent-ink"
        :href="directionsUrl(v.address)"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`Directions to ${v.name}`"
      >
        <NavigationIcon class="size-[1.125rem]" />
      </a>
    </div>
  </UiSheet>
</template>
