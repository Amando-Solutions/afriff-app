<script setup>
import { computed, ref, watch } from 'vue'
import { eventLook } from '~/lib/eventLook.js'

// The event's graphic if it has one (e.g. masterclass posters), otherwise a
// colour tile with an icon for its type. Size comes from the class you pass.
const props = defineProps({ event: { type: Object, required: true }, iconSize: { type: String, default: 'size-5' } })
const broken = ref(false)
watch(() => props.event.image, () => { broken.value = false })
const look = computed(() => eventLook(props.event))
</script>

<template>
  <div
    v-if="event.image && !broken"
    class="relative shrink-0 overflow-hidden bg-raised outline -outline-offset-1 outline-white/10"
    aria-hidden="true"
  >
    <img :src="event.image" alt="" loading="lazy" decoding="async" class="absolute inset-0 size-full object-cover" @error="broken = true" />
  </div>
  <div
    v-else
    class="grain grid shrink-0 place-items-center text-white outline -outline-offset-1 outline-white/10"
    :style="{ background: `linear-gradient(150deg, ${look.a} 0%, ${look.b} 100%)` }"
    aria-hidden="true"
  >
    <component :is="look.icon" :class="iconSize" :stroke-width="1.75" class="relative z-2" />
  </div>
</template>
