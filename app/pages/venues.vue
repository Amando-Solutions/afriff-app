<script setup>
import { ref } from 'vue'
import { InfoIcon, MapPinIcon, NavigationIcon } from 'lucide-vue-next'
import { SCREENINGS, VENUES } from '~/data/programme.js'
import { directionsUrl } from '~/lib/format.js'

// VENUES: each cinema with its colour dot, address and Directions.
useHead({ title: 'Venues' })
const howOpen = ref(false)
const count = (id) => SCREENINGS.filter((s) => s.venue === id).length
</script>

<template>
  <div>
    <PageTitle title="Venues" :icon="MapPinIcon" :description="`${VENUES.length} venue${VENUES.length === 1 ? '' : 's'} across Lagos`" />
    <UiButton variant="secondary" size="sm" class="mt-4" @click="howOpen = true"><InfoIcon /> How to attend</UiButton>
    <div class="mt-5 flex flex-col gap-3">
      <div v-for="v in VENUES" :key="v.id" class="card flex flex-col gap-1.5 p-4">
        <div class="flex items-center gap-2.5">
          <VenueDot :venue-id="v.id" :size="12" />
          <span class="text-h3 font-semibold">{{ v.name }}</span>
        </div>
        <p class="text-meta text-muted">{{ v.address }}</p>
        <p class="text-meta text-muted">{{ count(v.id) }} screenings this festival</p>
        <UiButton variant="secondary" size="sm" class="mt-1.5 self-start" :href="directionsUrl(v.address)"><NavigationIcon /> Directions</UiButton>
      </div>
    </div>
    <HowToAttendSheet v-model:open="howOpen" />
  </div>
</template>
