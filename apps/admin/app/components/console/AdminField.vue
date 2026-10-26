<script setup lang="ts">
import { computed } from 'vue'
import { COLLECTIONS, type FieldDef } from '~/lib/schema'
import type { DataDoc, Refs } from '~/lib/types'

const INPUT_TYPES: Partial<Record<FieldDef['type'], string>> = { number: 'number', url: 'url', time: 'time', color: 'color', datetime: 'datetime-local' }

// One form field, drawn from its description in schema.js.
const props = defineProps<{ f: FieldDef; refs: Refs }>()
const model = defineModel<string | boolean>()
// checkboxes hold true/false, every other field holds text
const text = computed({ get: () => (typeof model.value === 'string' ? model.value : ''), set: (v: string) => { model.value = v } })
const checked = computed({ get: () => model.value === true, set: (v: boolean) => { model.value = v } })

const inputType = computed(() => INPUT_TYPES[props.f.type] || 'text')
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
</script>

<template>
  <label v-if="f.type === 'checkbox'" class="flex items-start gap-3 py-1 text-body">
    <input v-model="checked" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]" />
    <span>{{ f.label }}<small v-if="f.hint" class="mt-0.5 block text-label text-muted">{{ f.hint }}</small></span>
  </label>
  <label v-else :for="f.key" class="flex flex-col gap-1.5 text-meta font-medium text-muted">
    <span>{{ f.label }}<em v-if="f.required" class="text-accent-ink not-italic"> *</em></span>
    <textarea v-if="f.type === 'textarea'" :id="f.key" v-model="text" rows="5" class="field-input" :required="f.required" />
    <select v-else-if="f.type === 'select' || f.type === 'day' || f.type === 'ref'" :id="f.key" v-model="text" class="field-input" :required="f.required">
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
      :inputmode="f.type === 'number' ? 'numeric' : undefined"
      :required="f.required"
    />
    <small v-if="f.hint" class="text-label font-normal">{{ f.hint }}</small>
  </label>
</template>
