<script setup>
// Bio that slides up when someone is tapped
defineProps({ member: { type: Object, default: null } })
const open = defineModel('open', { type: Boolean, default: false })
</script>

<template>
  <UiSheet v-model:open="open" :title="member?.jury || 'Jury'">
    <div v-if="member" class="flex flex-col items-center gap-2 text-center">
      <JuryAvatar :member="member" :size="96" ring />
      <h3 class="mt-2 font-display text-h2 font-semibold">{{ member.name }}</h3>
      <p class="text-meta text-muted">{{ [member.roles, member.country].filter(Boolean).join(' · ') }}</p>
      <p v-if="member.bio" class="mt-2 text-left text-prose text-ink/90">{{ member.bio }}</p>
    </div>
  </UiSheet>
</template>
