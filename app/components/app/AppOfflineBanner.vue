<script setup lang="ts">
import { WifiOffIcon } from 'lucide-vue-next'

const online = useOnline()
</script>

<template>
  <Transition
    enter-active-class="transition-[max-height,opacity] duration-250 ease-out"
    leave-active-class="transition-[max-height,opacity] duration-200 ease-out"
    enter-from-class="max-h-0 opacity-0"
    enter-to-class="max-h-12 opacity-100"
    leave-from-class="max-h-12 opacity-100"
    leave-to-class="max-h-0 opacity-0"
  >
    <div v-if="!online" role="status" class="overflow-hidden border-b border-line bg-raised text-center text-meta font-medium text-ink">
      <p class="flex items-center justify-center gap-2 px-4 py-2">
        <WifiOffIcon class="size-4 text-muted" aria-hidden="true" />
        You’re offline. The programme and your plan still work.
      </p>
    </div>
  </Transition>
</template>
