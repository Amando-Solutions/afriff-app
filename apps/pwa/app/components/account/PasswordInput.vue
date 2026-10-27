<script setup lang="ts">
import { ref } from 'vue'
import { EyeIcon, EyeOffIcon } from 'lucide-vue-next'

// A password box with Show / Hide inside it (dots unless shown).
withDefaults(defineProps<{
  id: string
  autocomplete: 'new-password' | 'current-password'
  invalid?: boolean
}>(), { invalid: false })
const model = defineModel<string>({ required: true })
const show = ref(false)
</script>

<template>
  <div class="relative">
    <input
      :id="id"
      v-model="model"
      :type="show ? 'text' : 'password'"
      :autocomplete="autocomplete"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      maxlength="128"
      class="field-input h-12 pr-20"
      :aria-invalid="invalid || undefined"
      :aria-describedby="invalid ? `${id}-error` : undefined"
    >
    <button
      type="button"
      class="pressable absolute inset-y-0 right-1 my-auto flex h-10 items-center gap-1 rounded-full px-2.5 text-label font-semibold text-muted hover:text-ink"
      :aria-pressed="show"
      :aria-label="show ? 'Hide password' : 'Show password'"
      @click="show = !show"
    >
      <component :is="show ? EyeOffIcon : EyeIcon" class="size-4" aria-hidden="true" /> {{ show ? 'Hide' : 'Show' }}
    </button>
  </div>
</template>
