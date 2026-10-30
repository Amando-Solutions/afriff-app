<script setup lang="ts">
import { computed } from 'vue'

// A panel's speakers in a schedule row: up to 3 overlapping initials circles,
// then "Name, Name + 3 more". `list`: everyone, one per line (event page).
// Each name always gets the same colour pair.
const props = defineProps<{ names: string[]; list?: boolean }>()

const TINTS: [string, string][] = [['#2B2560', '#C9C3FF'], ['#3A2A1A', '#E9C362'], ['#173A3A', '#8FE3D3'], ['#3A1F33', '#F2B6DA']]
const initialsOf = (name: string) => {
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')).toUpperCase()
}
const tintOf = (name: string) => {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997
  return TINTS[h % TINTS.length]!
}
const faces = computed(() => props.names.slice(0, 3).map((n) => ({ n, ini: initialsOf(n), tint: tintOf(n) })))
const line = computed(() => {
  const more = props.names.length - 2
  return props.names.slice(0, 2).join(', ') + (more > 0 ? ` + ${more} more` : '')
})
</script>

<template>
  <ul v-if="list" class="speaker-list">
    <li v-for="n in names" :key="n">
      <span class="speaker-face" :style="{ background: tintOf(n)[0], color: tintOf(n)[1] }" aria-hidden="true">{{ initialsOf(n) }}</span>
      {{ n }}
    </li>
  </ul>
  <span v-else-if="names.length" class="speaker-faces">
    <span class="speaker-faces-stack" aria-hidden="true">
      <span v-for="f in faces" :key="f.n" class="speaker-face" :style="{ background: f.tint[0], color: f.tint[1] }">{{ f.ini }}</span>
    </span>
    <span class="speaker-faces-names">{{ line }}</span>
  </span>
</template>
