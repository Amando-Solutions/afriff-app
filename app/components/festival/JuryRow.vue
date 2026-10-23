<script setup>
import { ref } from 'vue'
import { JURY } from '~/data/jury.js'

// "Meet the jury" row of faces (the Globe Awards page).
// Tapping a face opens their bio; "See all" opens the Jury page.
defineProps({ title: { type: String, default: 'Meet the jury' }, intro: { type: String, default: '' } })
const member = ref(null)
const open = ref(false)
function show(m) {
  member.value = m
  open.value = true
}
</script>

<template>
  <section v-if="JURY.length" class="mt-8">
    <UiSectionHeader :title="title" to="/jury" />
    <p v-if="intro" class="-mt-1 mb-3 text-meta text-muted">{{ intro }}</p>
    <div class="scroll-row gap-3.5 pt-0.5 pb-1">
      <button v-for="m in JURY" :key="m.id" type="button" class="pressable flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-1" @click="show(m)">
        <JuryAvatar :member="m" :size="60" ring />
        <span class="mt-1 max-w-[4.5rem] truncate text-label font-semibold">{{ m.name.replace(/^Dr\.?\s+/, '').split(' ')[0] }}</span>
        <span class="max-w-[4.5rem] truncate text-micro text-muted">{{ m.country.split(' / ')[0] }}</span>
      </button>
    </div>
    <JurySheet v-model:open="open" :member="member" />
  </section>
</template>
