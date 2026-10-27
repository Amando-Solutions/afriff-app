<script setup lang="ts">
import type { JuryMember } from '@afriff/core/types/festival'
// Bio that slides up when someone is tapped
defineProps<{ member: JuryMember | null }>()
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <BottomSheet v-model:open="open" :title="member?.jury || 'Jury'">
    <div v-if="member" class="jury-sheet">
      <JuryAvatar :member="member" :size="96" />
      <h3 class="jury-sheet-name">{{ member.name }}</h3>
      <p class="muted small">{{ [member.roles, member.country].filter(Boolean).join(' · ') }}</p>
      <p v-if="member.bio" class="jury-sheet-bio">{{ member.bio }}</p>
    </div>
  </BottomSheet>
</template>
