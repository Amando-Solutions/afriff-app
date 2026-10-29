<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { ImageUpIcon } from 'lucide-vue-next'
import { imageLink } from '@afriff/core/utils/links'
import { COLLECTIONS, type FieldDef } from '~/lib/schema'
import type { DataDoc, Refs } from '~/lib/types'
import { uploadPicture } from '~/lib/upload'

const INPUT_TYPES: Partial<Record<FieldDef['type'], string>> = { number: 'number', url: 'url', time: 'time', color: 'color', datetime: 'datetime-local' }

// One form field, drawn from its description in schema.ts, with its problem
// (lib/checks.ts) under it. "blur" = they left the field. Picture fields
// (schema `upload`) also get a preview and "Upload a picture"; "uploading"
// tells the form to hold Save until the link is in.
const props = defineProps<{ f: FieldDef; refs: Refs; error?: string }>()
const emit = defineEmits<{ blur: []; uploading: [busy: boolean] }>()
const model = defineModel<string | number | boolean>()
// checkboxes hold true/false; number boxes hold a number once edited (Vue's
// v-model does that for type="number"); every other field holds text.
// The number must come back as it is: turned into '' it emptied the box on
// every key press, so only the last digit typed was kept.
const text = computed({ get: () => (typeof model.value === 'boolean' || model.value == null ? '' : model.value), set: (v: string | number) => { model.value = v } })
const checked = computed({ get: () => model.value === true, set: (v: boolean) => { model.value = v } })

const inputType = computed(() => INPUT_TYPES[props.f.type] || 'text')
// most characters the box takes (numbers are limited by min / max instead)
const maxLength = computed(() => (props.f.type === 'text' ? props.f.max ?? 200 : props.f.type === 'textarea' ? props.f.max ?? 5000 : props.f.type === 'url' ? 2000 : undefined))
const aria = computed(() => ({
  'aria-invalid': props.error ? true : undefined,
  'aria-describedby': props.error ? `${props.f.key}-error` : undefined,
  'aria-required': props.f.required || undefined,
}))
// label each option the way its own list does (e.g. a screening shows film · day · time)
const refOptions = computed(() => {
  const ref = props.f.ref
  if (props.f.type !== 'ref' || !ref) return []
  const rc = COLLECTIONS[ref]
  const labelOf = (o: DataDoc) => [rc.label(o, props.refs), ref === 'screenings' ? rc.sub(o, props.refs) : ''].filter(Boolean).join(' · ')
  return Object.values((props.refs as Record<string, Record<string, DataDoc> | undefined>)[ref] || {})
    .sort(rc.sort)
    .map((o) => ({ value: o.id, label: labelOf(o) }))
})

// ---------- Picture fields: preview + upload ----------
const upload = reactive({ busy: false, percent: 0, msg: '', error: '', broken: false, slow: false })
// pictures shipped with the attendee app ("/masterclasses/…") live at its address, not this one
const attendeeUrl = String(useRuntimeConfig().public.attendeeUrl || '').replace(/\/$/, '')
const preview = computed(() => {
  const link = props.f.upload && typeof model.value === 'string' ? imageLink(model.value) : ''
  return link.startsWith('/') ? `${attendeeUrl}${link}` : link
})
watch(preview, () => { upload.broken = false })

async function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !props.f.upload || upload.busy) return
  Object.assign(upload, { busy: true, percent: 0, msg: '', error: '', slow: false })
  emit('uploading', true)
  // nothing sent after 15 s: Firebase keeps retrying for up to 2 minutes, so say so
  const slowTimer = setTimeout(() => { if (upload.busy && upload.percent === 0) upload.slow = true }, 15_000)
  try {
    model.value = await uploadPicture(file, props.f.upload, (p) => { upload.percent = p })
    upload.msg = 'Uploaded. Save to keep it.'
    emit('blur')
  } catch (err) {
    upload.error = err instanceof Error ? err.message : String(err)
  } finally {
    clearTimeout(slowTimer)
    Object.assign(upload, { busy: false, slow: false })
    emit('uploading', false)
  }
}
</script>

<template>
  <label v-if="f.type === 'checkbox'" class="flex items-start gap-3 py-1 text-body">
    <input v-model="checked" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]" />
    <span>{{ f.label }}<small v-if="f.hint" class="mt-0.5 block text-label text-muted">{{ f.hint }}</small></span>
  </label>
  <label v-else :for="f.key" class="flex flex-col gap-1.5 text-meta font-medium text-muted">
    <span>{{ f.label }}<em v-if="f.required" class="text-accent-ink not-italic"> *</em></span>
    <textarea v-if="f.type === 'textarea'" :id="f.key" v-model="text" rows="5" class="field-input" :maxlength="maxLength" v-bind="aria" @blur="emit('blur')" />
    <select v-else-if="f.type === 'select' || f.type === 'day' || f.type === 'ref'" :id="f.key" v-model="text" class="field-input" v-bind="aria" @blur="emit('blur')" @change="emit('blur')">
      <option value="">{{ f.required ? 'Choose…' : '— none —' }}</option>
      <option v-for="o in f.type === 'ref' ? refOptions : f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <input
      v-else
      :id="f.key"
      v-model="text"
      class="field-input"
      :class="f.type === 'color' && 'w-24! p-1!'"
      :type="inputType"
      :inputmode="f.type === 'number' ? 'numeric' : f.type === 'url' ? 'url' : undefined"
      :maxlength="maxLength"
      :min="f.type === 'number' ? f.min : undefined"
      :max="f.type === 'number' ? f.max : undefined"
      :step="f.type === 'number' ? (f.whole ? 1 : 'any') : undefined"
      :autocapitalize="f.type === 'url' ? 'off' : undefined"
      :spellcheck="f.type === 'url' ? false : undefined"
      :disabled="upload.busy || undefined"
      v-bind="aria"
      @blur="emit('blur')"
    />
    <span v-if="error" :id="`${f.key}-error`" class="text-meta font-normal text-danger" role="alert">{{ error }}</span>
    <small v-if="f.hint" class="text-label font-normal">{{ f.hint }}</small>
  </label>
  <!-- outside the label above, so tapping the button doesn't jump into the link box -->
  <div v-if="f.upload" class="-mt-2 flex items-center gap-3">
    <span class="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-tile border border-line bg-raised">
      <img v-if="preview && !upload.broken" :src="preview" alt="" class="size-full object-contain" @error="upload.broken = true" />
      <ImageUpIcon v-else class="size-5 text-muted" aria-hidden="true" />
    </span>
    <div class="flex min-w-0 flex-col items-start gap-1.5">
      <label
        class="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-meta font-semibold text-ink shadow-card hover:border-line-strong hover:bg-hover has-[:disabled]:pointer-events-none has-[:disabled]:opacity-45 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
      >
        <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" :disabled="upload.busy" @change="onPick" />
        <ImageUpIcon class="size-4" aria-hidden="true" />
        {{ upload.busy ? `Uploading… ${upload.percent}%` : preview ? 'Upload a new picture' : 'Upload a picture' }}
      </label>
      <span v-if="upload.slow" class="text-meta text-muted" role="status">Still trying to reach Firebase… (a slow connection, or picture uploads aren’t switched on yet)</span>
      <span v-else-if="upload.error" class="text-meta text-danger" role="alert">{{ upload.error }}</span>
      <span v-else-if="upload.msg" class="text-meta text-success" role="status">{{ upload.msg }}</span>
      <span v-else-if="preview && upload.broken" class="text-meta text-muted">This link doesn’t show a picture.</span>
    </div>
  </div>
</template>
