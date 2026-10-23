<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef, watch } from 'vue'
import { FESTIVAL } from '~/data/programme'
import { dateParts } from '~/lib/format'
import { planForDay } from '~/lib/plan'
import { useFestival } from '~/lib/store'

// Row of festival days, the original FilmFest-style strip (as in the React
// version): day name small on top, big date number with month and year
// stacked beside it. The picked day is light gold with a gold underline;
// the others are faded. A gold count beside the day name shows how many
// things you've planned that day.
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
  <div ref="row" role="radiogroup" aria-label="Festival day" class="scroll-row gap-5 border-t border-line pt-3.5">
    <button
      v-for="d in FESTIVAL.days"
      :key="d"
      type="button"
      role="radio"
      :aria-checked="model === d"
      class="shrink-0 border-b-[3px] pb-2 text-left transition-[opacity,border-color] duration-200 ease-out"
      :class="model === d ? 'border-accent opacity-100' : 'border-transparent opacity-40 hover:opacity-70'"
      @click="model = d"
    >
      <span class="mb-0.5 flex items-center text-meta" :class="model === d ? 'text-ink' : 'text-muted'">
        {{ dateParts(d).day }}
        <span
          v-if="planned(d)"
          class="ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.625rem] font-semibold text-on-accent tabular-nums"
          :aria-label="`${planned(d)} planned`"
        >{{ planned(d) }}</span>
      </span>
      <span class="flex items-center gap-1.5" :class="model === d ? 'text-accent-ink' : 'text-muted'">
        <span class="font-display text-display leading-none font-bold tracking-tight tabular-nums">{{ String(dateParts(d).date).padStart(2, '0') }}</span>
        <span class="text-label font-bold">{{ dateParts(d).monthUpper }}<br>{{ dateParts(d).year }}</span>
      </span>
    </button>
  </div>
</template>
