<script setup lang="ts">
import { CheckIcon, PlusSquareIcon, ShareIcon } from 'lucide-vue-next'

// The iPhone / iPad steps for adding AFRIFF to the Home Screen (Safari has no
// install button). Shown on the install-first screen (InstallFirst.vue) and in
// the alerts card's "Show me how" sheet (AlertsSwitch.vue).
const STEPS = [
  { icon: ShareIcon, text: 'Tap the Share button in Safari.', hint: 'On newer iPhones it’s under the ••• button.' },
  { icon: PlusSquareIcon, text: 'Scroll down and pick “Add to Home Screen”.' },
  { icon: CheckIcon, text: 'Tap “Add”. AFRIFF lands on your Home Screen.' },
]
</script>

<template>
  <ol class="if-steps">
    <li v-for="(s, i) in STEPS" :key="i">
      <span class="if-step-icon"><component :is="s.icon" :size="18" aria-hidden="true" /></span>
      <span>{{ s.text }}<span v-if="s.hint" class="if-hint">{{ s.hint }}</span></span>
    </li>
  </ol>
  <p class="if-note">No Share button? You’re in another app’s browser (like Instagram or WhatsApp). Open this page in Safari first.</p>
</template>
