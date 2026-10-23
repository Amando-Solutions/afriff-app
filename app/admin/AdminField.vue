<script setup>
import { computed } from 'vue'
import { COLLECTIONS } from './schema.js'

// One form field, drawn from its description in schema.js.
const props = defineProps({ f: { type: Object, required: true }, refs: { type: Object, required: true } })
const model = defineModel()

const inputType = computed(() => ({ number: 'number', url: 'url', time: 'time', color: 'color', datetime: 'datetime-local' })[props.f.type] || 'text')
// label each option the way its own list does (e.g. a screening shows film · day · time)
const refOptions = computed(() => {
  if (props.f.type !== 'ref') return []
  const rc = COLLECTIONS[props.f.ref]
  const labelOf = (o) => (rc ? [rc.label(o, props.refs), props.f.ref === 'screenings' ? rc.sub(o, props.refs) : ''].filter(Boolean).join(' · ') : o.title || o.name)
  return Object.values(props.refs[props.f.ref] || {})
    .sort(rc?.sort || ((a, b) => labelOf(a).localeCompare(labelOf(b))))
    .map((o) => ({ value: o.id, label: labelOf(o) }))
})
</script>

<template>
  <label v-if="f.type === 'checkbox'" class="flex items-start gap-3 py-1 text-body">
    <input v-model="model" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]" />
    <span>{{ f.label }}<small v-if="f.hint" class="mt-0.5 block text-label text-muted">{{ f.hint }}</small></span>
  </label>
  <label v-else :for="f.key" class="flex flex-col gap-1.5 text-meta font-medium text-muted">
    <span>{{ f.label }}<em v-if="f.required" class="text-accent-ink not-italic"> *</em></span>
    <textarea v-if="f.type === 'textarea'" :id="f.key" v-model="model" rows="5" class="field-input" :required="f.required" />
    <select v-else-if="f.type === 'select' || f.type === 'day' || f.type === 'ref'" :id="f.key" v-model="model" class="field-input" :required="f.required">
      <option value="">{{ f.required ? 'Choose…' : '— none —' }}</option>
      <option v-for="o in f.type === 'ref' ? refOptions : f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <input
      v-else
      :id="f.key"
      v-model="model"
      class="field-input"
      :class="f.type === 'color' && 'w-24! p-1!'"
      :type="inputType"
      :inputmode="f.type === 'number' ? 'numeric' : undefined"
      :required="f.required"
    />
    <small v-if="f.hint" class="text-label font-normal">{{ f.hint }}</small>
  </label>
</template>
