<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef, watch } from 'vue'
import { FESTIVAL } from '@afriff/core/data/programme'
import { dateParts } from '@afriff/core/utils/format'
import { planForDay } from '~/lib/plan'
import { useFestival } from '~/lib/store'

// Row of festival days: day name small on top, big date number with month and
// year beside it. The picked day is light gold with a gold underline; the
// others are faded. A gold count beside the day name = things planned that day.
const model = defineModel<string>({ required: true })
const { state } = useFestival()
const row = useTemplateRef<HTMLElement>('row')
const planned = (d: string) => planForDay(state.scheduled, d).length

function centre() {
  row.value?.querySelector('.day.on')?.scrollIntoView({ inline: 'center', block: 'nearest' })
}
onMounted(centre)
watch(model, () => nextTick(centre))
</script>

<template>
  <div ref="row" class="day-picker" role="tablist" aria-label="Festival day">
    <button
      v-for="d in FESTIVAL.days"
      :key="d"
      type="button"
      role="tab"
      :aria-selected="model === d"
      class="day"
      :class="{ on: model === d }"
      @click="model = d"
    >
      <span class="day-name">
        {{ dateParts(d).day }}
        <span v-if="planned(d)" class="day-badge" :aria-label="`${planned(d)} planned`">{{ planned(d) }}</span>
      </span>
      <span class="day-row">
        <span class="day-num">{{ String(dateParts(d).date).padStart(2, '0') }}</span>
        <span class="day-month">{{ dateParts(d).monthUpper }}<br>{{ dateParts(d).year }}</span>
      </span>
    </button>
  </div>
</template>
