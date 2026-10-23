<script setup lang="ts">
import { computed, reactive } from 'vue'
import { SPONSORS } from '~/data/programme'

// Sponsor logos gliding left to right on a loop.
// variant 'ribbon' = slim strip above the header on every screen,
// variant 'strip'  = larger strip at the bottom of Home.
// The list is repeated twice so the loop is seamless. Holding a finger on it
// pauses it; phones set to "reduce motion" get a still row you can swipe.
const props = withDefaults(defineProps<{ variant?: 'ribbon' | 'strip' }>(), { variant: 'strip' })

const list = computed(() => [...SPONSORS].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)))
// ~4–5 seconds per logo keeps it calm and readable
const seconds = computed(() => list.value.length * (props.variant === 'ribbon' ? 4 : 5))
const broken = reactive<Record<string, boolean>>({})

const sizes = computed(() =>
  props.variant === 'ribbon'
    ? { item: 'h-[2.125rem] px-[1.125rem]', img: 'max-h-4 max-w-[4.75rem]', name: 'text-micro' }
    : { item: 'h-16 px-6', img: 'max-h-[2.125rem] max-w-[7.5rem]', name: 'text-meta' },
)
</script>

<template>
  <div
    v-if="list.length"
    class="marquee"
    :class="variant === 'ribbon' ? 'border-b border-line bg-navy-950' : '-mx-4'"
    role="region"
    aria-label="Festival sponsors"
  >
    <div class="marquee-track" :class="variant === 'ribbon' ? 'bg-navy-950' : 'bg-canvas'" :style="{ '--marquee-duration': `${seconds}s` }">
      <template v-for="copy in [0, 1]" :key="copy">
        <component
          :is="s.website ? 'a' : 'span'"
          v-for="s in list"
          :key="`${s.name}-${copy}`"
          :href="s.website || undefined"
          :target="s.website ? '_blank' : undefined"
          :rel="s.website ? 'noopener noreferrer' : undefined"
          :tabindex="copy && s.website ? -1 : undefined"
          :aria-hidden="copy ? 'true' : undefined"
          class="grid flex-none place-items-center"
          :class="sizes.item"
        >
          <img
            v-if="s.logo && !broken[s.name]"
            :src="s.logo"
            :alt="copy ? '' : s.name"
            class="block object-contain"
            :class="[sizes.img, `logo-${s.logoStyle || 'white'}`]"
            decoding="async"
            @error="broken[s.name] = true"
          />
          <span v-else class="font-semibold whitespace-nowrap text-muted" :class="sizes.name">{{ s.name }}</span>
        </component>
      </template>
    </div>
  </div>
</template>
