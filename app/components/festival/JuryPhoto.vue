<script setup lang="ts">
import type { JuryMember } from '~/types/festival'
import { ref } from 'vue'
import { initials } from '~/lib/format'

// Rectangular portrait for the Jury page grid: the whole photo is shown
// (never cropped) inside a 4:5 frame; initials if there's no photo.
defineProps<{ member: Pick<JuryMember, 'name' | 'photo'> }>()
const broken = ref(false)
</script>

<template>
  <span class="relative block aspect-[4/5] w-full overflow-hidden rounded-tile border border-line bg-raised">
    <img v-if="member.photo && !broken" :src="member.photo" alt="" loading="lazy" decoding="async" class="absolute inset-0 size-full object-contain" @error="broken = true" />
    <span v-else class="absolute inset-0 grid place-items-center font-display text-display font-semibold text-subtle" aria-hidden="true">
      {{ initials(member.name.replace(/^Dr\.?\s+/, '')) }}
    </span>
  </span>
</template>
