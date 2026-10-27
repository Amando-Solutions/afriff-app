<script setup lang="ts">
import { computed } from 'vue'
import { StarIcon } from 'lucide-vue-next'
import { useFestival } from '~/lib/store'

// 1–5 stars for a film marked "Seen it": on the film page and in My Festival's
// Watched list, same rating in both. Tapping your current rating again clears it.
const props = defineProps<{ filmId: string; title: string }>()
const { state, rateWatched } = useFestival()
const rating = computed(() => state.watched.get(props.filmId)?.rating ?? 0)
const rate = (n: number) => rateWatched(props.filmId, rating.value === n ? 0 : n)
</script>

<template>
  <div class="stars" role="radiogroup" :aria-label="`Your rating for ${title}`">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      role="radio"
      :aria-checked="rating === n"
      :aria-label="`${n} star${n > 1 ? 's' : ''}`"
      :class="{ on: n <= rating }"
      @click="rate(n)"
    >
      <StarIcon :size="20" :fill="n <= rating ? 'currentColor' : 'none'" :stroke-width="1.8" />
    </button>
  </div>
</template>
