<script setup lang="ts">
// A PIN (4 digits) or emailed code (6 digits) box: number keypad on phones,
// digits only, hidden as dots unless "Show PIN" is on.
const props = withDefaults(defineProps<{
  id: string
  autocomplete: string
  length?: number
  show?: boolean
  invalid?: boolean
}>(), { length: 4, show: false, invalid: false })
const model = defineModel<string>({ required: true })

function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '').slice(0, props.length)
  if (el.value !== digits) el.value = digits
  model.value = digits
}
</script>

<template>
  <input
    :id="id"
    :value="model"
    :type="show ? 'text' : 'password'"
    inputmode="numeric"
    pattern="[0-9]*"
    :maxlength="length"
    :autocomplete="autocomplete"
    autocorrect="off"
    spellcheck="false"
    class="field-input h-12 font-semibold tracking-[0.4em] tabular-nums placeholder:tracking-normal placeholder:font-normal"
    :aria-invalid="invalid || undefined"
    :aria-describedby="invalid ? `${id}-error` : undefined"
    @input="onInput"
  >
</template>
