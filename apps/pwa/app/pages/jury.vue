<script setup lang="ts">
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

const member = ref<JuryMember | null>(null)
const open = ref(false)
function show(m: JuryMember) {
  member.value = m
  open.value = true
}
</script>

<template>
  <div class="page">
    <PageTitle title="The Jury" :icon="AwardIcon" />
    <div class="jury-tools">
      <p class="muted">AFRIFF 15 · {{ total }} jury member{{ total === 1 ? '' : 's' }} choosing this year's Globe Award winners</p>
      <div class="toggle" role="group" aria-label="View">
        <button type="button" :class="{ on: view === 'grid' }" :aria-pressed="view === 'grid'" aria-label="Grid view" @click="setView('grid')"><LayoutGridIcon :size="18" /></button>
        <button type="button" :class="{ on: view === 'list' }" :aria-pressed="view === 'list'" aria-label="List view" @click="setView('list')"><ListIcon :size="20" /></button>
      </div>
    </div>

    <section v-for="g in groups" :key="g.name" class="jury-group">
      <h2 class="jury-group-head">{{ g.name }} <span class="af-count">{{ g.members.length }}</span></h2>
      <div v-if="view === 'grid'" class="jury-grid">
        <component :is="m.bio ? 'button' : 'div'" v-for="m in g.members" :key="m.id" :type="m.bio ? 'button' : undefined" class="jury-tile" @click="m.bio && show(m)">
          <JuryPhoto :member="m" />
          <span class="jury-card-name">{{ m.name }}</span>
          <span class="muted small jury-tile-roles">{{ m.roles }}</span>
          <span class="jury-card-country">{{ m.country }}</span>
        </component>
      </div>
      <div v-else class="stack">
        <component :is="m.bio ? 'button' : 'div'" v-for="m in g.members" :key="m.id" :type="m.bio ? 'button' : undefined" class="jury-card" @click="m.bio && show(m)">
          <JuryAvatar :member="m" :size="56" />
          <span class="jury-card-text">
            <span class="jury-card-name">{{ m.name }}</span>
            <span class="muted small">{{ m.roles }}</span>
            <span class="jury-card-country">{{ m.country }}</span>
          </span>
          <ChevronRightIcon v-if="m.bio" :size="18" class="jury-card-chevron" />
        </component>
      </div>
    </section>

    <div class="jury-links">
      <a class="link" :href="JURY_LINKS.pressRelease" target="_blank" rel="noopener noreferrer">Read the jury announcement <ArrowUpRightIcon :size="16" /></a>
      <a class="link" :href="JURY_LINKS.pastJuries" target="_blank" rel="noopener noreferrer">See past juries on afriff.com <ArrowUpRightIcon :size="16" /></a>
    </div>

    <JurySheet v-model:open="open" :member="member" />
  </div>
</template>
