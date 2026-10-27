<script setup lang="ts">
import type { JuryMember } from '@afriff/core/types/festival'
import { ref } from 'vue'
import { initials } from '@afriff/core/utils/format'

// Rectangular portrait for the Jury page grid: the whole photo is shown
// (never cropped) inside a 4:5 frame; initials if there's no photo.
defineProps<{ member: Pick<JuryMember, 'name' | 'photo'> }>()
const broken = ref(false)
</script>

<template>
  <span class="jury-photo">
    <img v-if="member.photo && !broken" :src="member.photo" alt="" loading="lazy" decoding="async" @error="broken = true" />
    <span v-else class="jury-photo-initials" aria-hidden="true">{{ initials(member.name.replace(/^Dr\.?\s+/, '')) }}</span>
  </span>
</template>
