<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { answerConfirm, confirmDialog } from '~/lib/confirm'

// The console's confirmation sheet (lib/confirm.ts): the question, what happens,
// and the two buttons; for askNote() also a note box. Mounted once, in app.vue.
const o = computed(() => confirmDialog.options)
const paragraphs = computed(() => (o.value?.message ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean))
const noteBox = useTemplateRef<HTMLTextAreaElement>('noteBox')

watch(() => confirmDialog.open, async (open) => {
  if (!open || confirmDialog.kind !== 'note') return
  await nextTick()
  noteBox.value?.focus()
})
watch(() => confirmDialog.note, () => { if (confirmDialog.note.trim()) confirmDialog.error = '' })
</script>

<template>
  <UiSheet :open="confirmDialog.open" :title="o?.title ?? ''" @update:open="(open: boolean) => { if (!open) answerConfirm(false) }">
    <form v-if="o" class="flex flex-col gap-4" novalidate @submit.prevent="answerConfirm(true)">
      <p v-for="(p, i) in paragraphs" :key="i" class="text-body text-muted">{{ p }}</p>
      <ul v-if="o.items?.length" class="flex flex-col gap-1 rounded-tile bg-raised px-3.5 py-2.5 text-meta">
        <li v-for="item in o.items" :key="item">{{ item }}</li>
      </ul>
      <label v-if="confirmDialog.kind === 'note'" class="flex flex-col gap-1.5 text-meta font-medium text-muted">
        {{ o.noteLabel }}
        <textarea
          ref="noteBox"
          v-model="confirmDialog.note"
          rows="3"
          class="field-input"
          :placeholder="o.placeholder"
          :maxlength="o.maxLength ?? 1000"
          :aria-invalid="confirmDialog.error ? true : undefined"
          aria-describedby="confirm-note-error"
        />
        <span v-if="confirmDialog.error" id="confirm-note-error" class="text-danger" role="alert">{{ confirmDialog.error }}</span>
      </label>
      <div class="flex flex-wrap gap-2.5">
        <UiButton type="submit" size="lg" :variant="o.tone === 'danger' ? 'danger' : 'primary'">{{ o.confirmLabel }}</UiButton>
        <UiButton size="lg" variant="secondary" @click="answerConfirm(false)">{{ o.cancelLabel ?? 'Cancel' }}</UiButton>
      </div>
    </form>
  </UiSheet>
</template>
