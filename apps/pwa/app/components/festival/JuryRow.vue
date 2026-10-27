<script setup lang="ts">
import type { JuryMember } from '@afriff/core/types/festival'
import { ref } from 'vue'
import { ChevronRightIcon } from 'lucide-vue-next'
import { JURY } from '@afriff/core/data/jury'

// "Meet the jury" row of faces (the Globe Awards page).
// Tapping a face opens their bio (members with no bio yet aren't tappable);
// "See all" opens the Jury page.
withDefaults(defineProps<{ title?: string; intro?: string }>(), { title: 'Meet the jury', intro: '' })
const member = ref<JuryMember | null>(null)
const open = ref(false)
function show(m: JuryMember) {
  member.value = m
  open.value = true
}
</script>

<template>
  <section v-if="JURY.length" class="section">
    <div class="section-head">
      <h2 class="section-title">{{ title }}</h2>
      <NuxtLink to="/jury" class="link">See all <ChevronRightIcon :size="18" /></NuxtLink>
    </div>
    <p v-if="intro" class="muted small jury-intro">{{ intro }}</p>
    <div class="jury-row">
      <component :is="m.bio ? 'button' : 'div'" v-for="m in JURY" :key="m.id" :type="m.bio ? 'button' : undefined" class="jury-face" @click="m.bio && show(m)">
        <JuryAvatar :member="m" :size="60" />
        <span class="jury-face-name">{{ m.name.replace(/^Dr\.?\s+/, '').split(' ')[0] }}</span>
        <span class="jury-face-country">{{ m.country.split(' / ')[0] }}</span>
      </component>
    </div>
    <JurySheet v-model:open="open" :member="member" />
  </section>
</template>
