<script setup>
import { computed } from 'vue'
import { MinusIcon } from 'lucide-vue-next'
import { dateParts, timeLabel } from '~/lib/format.js'
import { planForDay } from '~/lib/plan.js'
import { useFestival } from '~/lib/store.js'

// "My plan" sheet: what you've added for the day you're looking at.
const props = defineProps({ day: { type: String, required: true } })
const open = defineModel('open', { type: Boolean, default: false })
const { state, toggleScheduled } = useFestival()
const p = computed(() => dateParts(props.day))
const mine = computed(() => planForDay(state.scheduled, props.day))
</script>

<template>
  <UiSheet v-model:open="open" title="My plan">
    <div class="card p-4">
      <div class="mb-2 font-display text-h3 font-semibold text-accent-ink">{{ p.day }} {{ p.date }} {{ p.month }}</div>
      <p v-if="mine.length === 0" class="text-meta text-muted">Nothing planned for this day yet. Tap + on any screening or event to add it.</p>
      <div v-for="item in mine" :key="item.id" class="flex items-start gap-3 border-t border-line py-3 first-of-type:border-0">
        <span class="w-16 shrink-0 pt-0.5 text-meta font-semibold text-accent-ink tabular-nums">{{ timeLabel(item.time) }}</span>
        <NuxtLink :to="item.href" class="flex min-w-0 flex-1 flex-col gap-0.5" @click="open = false">
          <span class="flex flex-wrap items-center gap-1.5 text-body font-semibold">{{ item.title }} <StatusTag :status="item.status" /></span>
          <span v-if="item.typeLabel" class="text-micro font-semibold tracking-wider text-accent-ink uppercase">{{ item.typeLabel }}</span>
          <VenueLine :venue-id="item.venue" :place="item.venue ? '' : item.where" :screen="item.venue ? item.where.split(' · ')[1] : ''" />
        </NuxtLink>
        <button
          type="button"
          class="pressable grid size-8 shrink-0 place-items-center rounded-full border border-line bg-raised"
          :aria-label="`Remove ${item.title} from your plan`"
          @click="toggleScheduled(item.id)"
        >
          <MinusIcon class="size-4" />
        </button>
      </div>
    </div>
    <p class="mt-3.5 text-meta text-muted">Leave time between films for the queue and travel across Lagos.</p>
    <NuxtLink to="/my" class="mt-3 inline-block text-meta font-medium text-accent-ink" @click="open = false">See your whole festival →</NuxtLink>
  </UiSheet>
</template>
