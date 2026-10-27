<script setup lang="ts">
import { CheckIcon, PlusIcon } from 'lucide-vue-next'

// Round + that turns into a gold tick once it's in My Festival.
withDefaults(defineProps<{ added?: boolean; title?: string; big?: boolean }>(), { title: '' })
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    class="round-btn"
    :class="{ added, big }"
    :aria-pressed="added"
    :aria-label="added ? `Remove ${title} from My Festival` : `Add ${title} to My Festival`"
    @click.stop.prevent="emit('toggle')"
  >
    <CheckIcon v-if="added" :size="20" :stroke-width="2.4" />
    <PlusIcon v-else :size="20" :stroke-width="2" />
  </button>
</template>
