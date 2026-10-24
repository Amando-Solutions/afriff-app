<script setup lang="ts">
import { computed } from 'vue'
import { MinusIcon } from 'lucide-vue-next'
import { dateParts, timeLabel } from '@afriff/core/utils/format'
import { planForDay } from '~/lib/plan'
import { useFestival } from '~/lib/store'

// "My plan" sheet: what you've added for the day you're looking at.
const props = defineProps<{ day: string }>()
const open = defineModel<boolean>('open', { default: false })
const { state, toggleScheduled } = useFestival()
const p = computed(() => dateParts(props.day))
const mine = computed(() => planForDay(state.scheduled, props.day))
</script>

<template>
  <UiSheet v-model:open="open" title="My plan">
    <div>
      <h3 class="mb-1 font-display text-h2 font-semibold">{{ p.day }} {{ p.date }} {{ p.month }}</h3>
      <p v-if="mine.length === 0" class="text-meta text-muted">Nothing planned for this day yet. Tap + on any screening or event to add it.</p>
      <div v-for="item in mine" :key="item.id" class="flex items-start gap-3 border-b border-line py-3">
        <span class="w-16 shrink-0 pt-0.5 text-meta font-semibold text-ink tabular-nums">{{ timeLabel(item.time) }}</span>
        <NuxtLink :to="item.href" class="flex min-w-0 flex-1 flex-col gap-0.5" @click="open = false">
          <span class="flex flex-wrap items-center gap-1.5 text-body font-semibold">{{ item.title }} <StatusTag :status="item.status" /></span>
          <span v-if="item.kind === 'event'" class="eyebrow text-subtle">{{ item.typeLabel }}</span>
          <VenueLine :venue-id="item.venue" :place="item.venueName" :screen="item.room" />
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
