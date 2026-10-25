<script setup lang="ts">
import type { Component } from 'vue'
import type { JuryMember } from '@afriff/core/types/festival'
import { computed, ref } from 'vue'
import { ArrowUpRightIcon, AwardIcon, ChevronRightIcon, LayoutGridIcon, ListIcon } from 'lucide-vue-next'
import { JURY_LINKS, juryGroups } from '@afriff/core/data/jury'

// THE JURY: one heading per jury, a card per member; tapping a card slides up
// their bio (members with no bio yet aren't tappable, so nobody opens an empty sheet). Grid by default, with a list toggle (the phone remembers the choice).
useHead({ title: 'The Jury' })
const VIEW_KEY = 'afriff-jury-view'
const groups = computed(() => juryGroups())
const total = computed(() => groups.value.reduce((n, g) => n + g.members.length, 0))

const view = ref<'grid' | 'list'>((() => { try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid' } catch { return 'grid' } })())
function setView(v: 'grid' | 'list') {
  view.value = v
  try { localStorage.setItem(VIEW_KEY, v) } catch { /* not saved, fine */ }
}
const VIEWS: { value: 'grid' | 'list'; label: string; icon: Component }[] = [{ value: 'grid', label: 'Grid view', icon: LayoutGridIcon }, { value: 'list', label: 'List view', icon: ListIcon }]

const member = ref<JuryMember | null>(null)
const open = ref(false)
function show(m: JuryMember) {
  member.value = m
  open.value = true
}
</script>

<template>
  <div>
    <PageTitle title="The Jury" :icon="AwardIcon" />
    <div class="mt-1 flex items-start justify-between gap-3">
      <p class="text-muted">AFRIFF 15 · {{ total }} jury member{{ total === 1 ? '' : 's' }} choosing this year's Globe Award winners</p>
      <UiToggle :model-value="view" :options="VIEWS" @update:model-value="setView" />
    </div>

    <section v-for="g in groups" :key="g.name" class="mt-7">
      <h2 class="mb-3 flex items-baseline gap-2 font-display text-h2 font-semibold">{{ g.name }} <span class="text-label font-normal text-muted tabular-nums">{{ g.members.length }}</span></h2>
      <div v-if="view === 'grid'" class="grid grid-cols-2 gap-x-3 gap-y-5">
        <component :is="m.bio ? 'button' : 'div'" v-for="m in g.members" :key="m.id" :type="m.bio ? 'button' : undefined" class="flex flex-col items-start gap-0.5 text-left" :class="m.bio && 'pressable'" @click="m.bio && show(m)">
          <JuryPhoto :member="m" />
          <span class="mt-2 text-body leading-snug font-semibold">{{ m.name }}</span>
          <span class="line-clamp-2 text-label text-muted">{{ m.roles }}</span>
          <span class="text-label text-subtle">{{ m.country }}</span>
        </component>
      </div>
      <div v-else class="flex flex-col gap-2.5">
        <component :is="m.bio ? 'button' : 'div'" v-for="m in g.members" :key="m.id" :type="m.bio ? 'button' : undefined" class="card flex items-center gap-3 p-3 text-left" :class="m.bio && 'card-interactive'" @click="m.bio && show(m)">
          <JuryAvatar :member="m" :size="56" />
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="text-body font-semibold">{{ m.name }}</span>
            <span class="text-meta text-muted">{{ m.roles }}</span>
            <span class="text-label text-subtle">{{ m.country }}</span>
          </span>
          <ChevronRightIcon v-if="m.bio" class="size-[1.125rem] shrink-0 text-muted" />
        </component>
      </div>
    </section>

    <div class="mt-8 flex flex-col items-start gap-2">
      <a class="inline-flex items-center gap-0.5 text-meta font-medium text-accent-ink" :href="JURY_LINKS.pressRelease" target="_blank" rel="noopener noreferrer">Read the jury announcement <ArrowUpRightIcon class="size-4" /></a>
      <a class="inline-flex items-center gap-0.5 text-meta font-medium text-accent-ink" :href="JURY_LINKS.pastJuries" target="_blank" rel="noopener noreferrer">See past juries on afriff.com <ArrowUpRightIcon class="size-4" /></a>
    </div>

    <JurySheet v-model:open="open" :member="member" />
  </div>
</template>
