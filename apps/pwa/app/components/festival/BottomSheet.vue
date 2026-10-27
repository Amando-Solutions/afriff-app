<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { XIcon } from 'lucide-vue-next'

// A panel that slides up from the bottom, with a rounded top and a close X.
// v-model:open shows and hides it.
defineProps<{ title: string }>()
const open = defineModel<boolean>('open', { default: false })

const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') open.value = false }
let prevOverflow = ''
watch(open, (v) => {
  if (v) {
    document.addEventListener('keydown', onKey)
    prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', onKey)
    document.body.style.overflow = prevOverflow
  }
}, { immediate: true })
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  if (open.value) document.body.style.overflow = prevOverflow
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="bs-root" role="dialog" aria-modal="true" :aria-label="title">
      <div class="bs-backdrop" @click="open = false" />
      <div class="bs-panel">
        <div class="bs-handle" aria-hidden="true" />
        <div class="bs-head">
          <h2 class="bs-title">{{ title }}</h2>
          <button type="button" class="bs-close" aria-label="Close" @click="open = false">
            <XIcon :size="22" />
          </button>
        </div>
        <div class="bs-body"><slot /></div>
      </div>
    </div>
  </Teleport>
</template>
