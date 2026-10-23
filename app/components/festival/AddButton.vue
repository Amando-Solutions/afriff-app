<script setup lang="ts">
import { CheckIcon, PlusIcon } from 'lucide-vue-next'

// Round + that turns into a gold tick once it's in My Festival.
withDefaults(defineProps<{ added?: boolean; title?: string; big?: boolean }>(), { title: '' })
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    class="pressable grid shrink-0 place-items-center rounded-full border"
    :class="[
      big ? 'size-11' : 'size-9',
      added ? 'border-accent bg-accent text-on-accent' : 'border-line bg-raised text-ink hover:border-line-strong',
    ]"
    :aria-pressed="added"
    :aria-label="added ? `Remove ${title} from My Festival` : `Add ${title} to My Festival`"
    @click.stop.prevent="emit('toggle')"
  >
    <CheckIcon v-if="added" class="size-[1.125rem]" :stroke-width="2.5" />
    <PlusIcon v-else class="size-[1.125rem]" :stroke-width="2" />
  </button>
</template>
