<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef, watch } from 'vue'
import { FESTIVAL } from '~/data/programme'
import { dateParts } from '~/lib/format'
import { planForDay } from '~/lib/plan'
import { useFestival } from '~/lib/store'

// Row of festival days: day name small on top, date number big, gold when picked.
// A gold count shows how many things you've planned that day.
const model = defineModel<string>({ required: true })
const { state } = useFestival()
const row = useTemplateRef<HTMLElement>('row')
const planned = (d: string) => planForDay(state.scheduled, d).length

function centre() {
  row.value?.querySelector('[aria-checked="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
}
onMounted(centre)
watch(model, () => nextTick(centre))
</script>

<template>
  <div ref="row" role="radiogroup" aria-label="Festival day" class="scroll-row gap-1.5 py-0.5">
    <button
      v-for="d in FESTIVAL.days"
      :key="d"
      type="button"
      role="radio"
      :aria-checked="model === d"
      class="pressable relative flex w-[3.25rem] shrink-0 flex-col items-center rounded-tile border py-1.5"
      :class="model === d ? 'border-accent/60 bg-accent-soft text-accent-ink' : 'border-line bg-surface text-ink hover:border-line-strong hover:bg-hover'"
      @click="model = d"
    >
      <span class="text-micro font-medium" :class="model === d ? '' : 'text-muted'">{{ dateParts(d).day }}</span>
      <span class="text-h3 leading-6 font-semibold tabular-nums">{{ dateParts(d).date }}</span>
      <span class="text-micro" :class="model === d ? 'opacity-80' : 'text-subtle'">{{ dateParts(d).month }}</span>
      <span
        v-if="planned(d)"
        class="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.625rem] font-semibold text-on-accent tabular-nums ring-2 ring-canvas"
        :aria-label="`${planned(d)} planned`"
      >{{ planned(d) }}</span>
    </button>
  </div>
</template>
