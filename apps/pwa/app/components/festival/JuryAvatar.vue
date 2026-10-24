<script setup lang="ts">
import type { JuryMember } from '@afriff/core/types/festival'
import { ref } from 'vue'
import { initials } from '@afriff/core/utils/format'

// Round photo, or initials if there's no photo (or it fails to load)
withDefaults(defineProps<{ member: Pick<JuryMember, 'name' | 'photo'>; size?: number; ring?: boolean }>(), { size: 56 })
const broken = ref(false)
</script>

<template>
  <img
    v-if="member.photo && !broken"
    :src="member.photo"
    alt=""
    loading="lazy"
    decoding="async"
    class="block shrink-0 rounded-full border-2 bg-raised object-cover"
    :class="ring ? 'border-accent' : 'border-line'"
    :style="{ width: `${size}px`, height: `${size}px` }"
    @error="broken = true"
  />
  <span
    v-else
    class="grid shrink-0 place-items-center rounded-full border-2 bg-raised font-display font-semibold text-muted"
    :class="ring ? 'border-accent' : 'border-line'"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.32)}px` }"
    aria-hidden="true"
  >{{ initials(member.name.replace(/^Dr\.?\s+/, '')) }}</span>
</template>
