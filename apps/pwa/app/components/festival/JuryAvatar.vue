<script setup lang="ts">
import type { JuryMember } from '@afriff/core/types/festival'
import { ref } from 'vue'
import { initials } from '@afriff/core/utils/format'

// Round photo, or initials if there's no photo (or it fails to load)
withDefaults(defineProps<{ member: Pick<JuryMember, 'name' | 'photo'>; size?: number }>(), { size: 56 })
const broken = ref(false)
</script>

<template>
  <img
    v-if="member.photo && !broken"
    class="jury-avatar"
    :style="{ width: `${size}px`, height: `${size}px` }"
    :src="member.photo"
    alt=""
    loading="lazy"
    decoding="async"
    @error="broken = true"
  />
  <span
    v-else
    class="jury-avatar initials"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.32)}px` }"
    aria-hidden="true"
  >{{ initials(member.name.replace(/^Dr\.?\s+/, '')) }}</span>
</template>
