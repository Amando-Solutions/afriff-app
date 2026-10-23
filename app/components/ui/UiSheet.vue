<script setup lang="ts">
import { onMounted, useId, useTemplateRef, watch } from 'vue'
import { useScrollLock } from '@vueuse/core'
import { XIcon } from 'lucide-vue-next'

/**
 * Bottom sheet built on the native <dialog>: focus is trapped, Esc closes it and
 * the page behind is inert. Slides up from the bottom, rounded top, close X.
 */
defineProps<{ title: string }>()
const open = defineModel<boolean>('open', { default: false })

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const titleId = useId()
const locked = useScrollLock(typeof document === 'undefined' ? null : document.body)

watch(
  open,
  (value) => {
    const el = dialog.value
    if (!el) return
    if (value && !el.open) el.showModal()
    if (!value && el.open) el.close()
    locked.value = value
  },
  { flush: 'post' },
)

onMounted(() => {
  if (open.value) {
    dialog.value?.showModal()
    locked.value = true
  }
})

function onBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) open.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="ui-sheet m-0 mx-auto mt-auto max-h-[88dvh] w-full max-w-xl overflow-hidden rounded-t-[1.5rem] border border-b-0 border-line bg-surface p-0 text-ink shadow-pop"
    @close="open = false"
    @click="onBackdropClick"
  >
    <div class="flex max-h-[inherit] flex-col">
      <div class="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
      <header class="flex items-center justify-between gap-4 border-b border-line py-2.5 pr-3 pl-5">
        <h2 :id="titleId" class="text-h3 font-semibold">{{ title }}</h2>
        <button
          type="button"
          class="pressable grid size-9 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink"
          aria-label="Close"
          @click="open = false"
        >
          <XIcon class="size-5" />
        </button>
      </header>
      <div class="pb-safe min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-6">
        <slot />
      </div>
    </div>
  </dialog>
</template>
