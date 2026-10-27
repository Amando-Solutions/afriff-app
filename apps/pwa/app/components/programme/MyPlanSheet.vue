<script setup lang="ts">
import { computed } from 'vue'
import { MinusIcon } from 'lucide-vue-next'
import { dateParts, timeLabel } from '@afriff/core/utils/format'
import { planForDay, planWhere } from '~/lib/plan'
import { useFestival } from '~/lib/store'

// "My plan" sheet: what you've added for the day you're looking at.
const props = defineProps<{ day: string }>()
const open = defineModel<boolean>('open', { default: false })
const { state, toggleScheduled } = useFestival()
const p = computed(() => dateParts(props.day))
const mine = computed(() => planForDay(state.scheduled, props.day))
</script>

<template>
  <BottomSheet v-model:open="open" title="My plan">
    <div class="plan-card">
      <div class="plan-day">{{ p.day }} {{ p.month }} {{ p.date }}</div>
      <p v-if="mine.length === 0" class="muted small">Nothing planned for this day yet. Tap + on any screening or event to add it.</p>
      <div v-for="item in mine" :key="item.id" class="plan-row">
        <span class="plan-time">{{ timeLabel(item.time) }}</span>
        <NuxtLink :to="item.href" class="plan-body" @click="open = false">
          <span class="plan-title">{{ item.title }} <StatusTag :status="item.status" /></span>
          <span v-if="item.kind === 'event'" class="row-cat gold">{{ item.typeLabel }}</span>
          <span class="venue-line"><VenueDot v-if="item.venue" :venue-id="item.venue" /> {{ planWhere(item) }}</span>
        </NuxtLink>
        <button type="button" class="round-btn small" :aria-label="`Remove ${item.title} from your plan`" @click="toggleScheduled(item.id)">
          <MinusIcon :size="18" />
        </button>
      </div>
    </div>
    <p class="muted small" style="margin-top: 14px">Leave time between films for the queue and travel across Lagos.</p>
    <NuxtLink to="/my" class="link" style="margin-top: 12px" @click="open = false">See your whole festival →</NuxtLink>
  </BottomSheet>
</template>
