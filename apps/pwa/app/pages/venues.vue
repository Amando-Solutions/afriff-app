<script setup lang="ts">
import { ref } from 'vue'
import { InfoIcon, MapPinIcon, NavigationIcon } from 'lucide-vue-next'
import { SCREENINGS, VENUES } from '@afriff/core/data/programme'
import { directionsUrl } from '@afriff/core/utils/format'

// VENUES: each cinema with its colour dot, address and Directions.
useHead({ title: 'Venues' })
const howOpen = ref(false)
const count = (id: string) => SCREENINGS.filter((s) => s.venue === id).length
</script>

<template>
  <div class="page">
    <PageTitle title="Venues" :icon="MapPinIcon" />
    <p class="muted">{{ VENUES.length }} venue{{ VENUES.length === 1 ? '' : 's' }} across Lagos</p>
    <button type="button" class="btn btn-outline btn-small" style="margin-top: 14px" @click="howOpen = true">
      <InfoIcon :size="16" /> How to attend
    </button>
    <div class="stack" style="margin-top: 20px">
      <div v-for="v in VENUES" :key="v.id" class="venue-card">
        <div class="venue-card-head">
          <VenueDot :venue-id="v.id" :size="12" />
          <span class="row-title">{{ v.name }}</span>
        </div>
        <p class="muted small">{{ v.address }}</p>
        <p class="muted small">{{ count(v.id) }} screenings this festival</p>
        <a class="btn btn-outline btn-small" :href="directionsUrl(v.address)" target="_blank" rel="noopener noreferrer">
          <NavigationIcon :size="16" /> Directions
        </a>
      </div>
    </div>
    <HowToAttendSheet v-model:open="howOpen" />
  </div>
</template>
