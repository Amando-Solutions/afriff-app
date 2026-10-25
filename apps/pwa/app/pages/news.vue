<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { Tone } from '@afriff/core/types/festival'
import type { BadgeTone } from '@afriff/theme/components/ui/UiBadge.vue'
import { ArrowRightIcon, ArrowUpRightIcon, BellIcon } from 'lucide-vue-next'
import { NEWS } from '@afriff/core/data/programme'
import { NEWS_TAGS, markAllNewsSeen, newsLink } from '~/lib/alerts'

// NEWS & ALERTS: changes to screenings and events, and festival news. Newest first.
useHead({ title: 'News & alerts' })
// opening News clears the count on the bell
onMounted(markAllNewsSeen)

const when = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
  } catch {
    return ''
  }
}
const TONE: Record<Tone, BadgeTone> = { alert: 'danger', gold: 'accent', good: 'success', muted: 'neutral' }

// each item with its tag and "View" link worked out once
const items = computed(() => NEWS.map((n) => {
  const tag = n.type ? NEWS_TAGS[n.type] : undefined
  return { n, tag, link: newsLink(n), alert: Boolean(n.urgent || tag?.tone === 'alert') }
}))
</script>

<template>
  <div>
    <PageTitle title="News & alerts" :icon="BellIcon" description="Changes to screenings and events, and festival news. Newest first." />
    <UiEmptyState v-if="NEWS.length === 0" :icon="BellIcon" title="No news yet" description="Changes to the programme will appear here." />
    <div class="mt-5 flex flex-col gap-3">
      <article v-for="{ n, tag, link, alert } in items" :key="n.id" class="card flex flex-col gap-1 p-4" :class="alert && 'border-danger/40'">
        <!-- tag and date on one quiet line, then the headline leads -->
        <div class="flex items-center gap-2">
          <UiBadge v-if="tag" :tone="TONE[tag.tone]">{{ tag.text }}</UiBadge>
          <UiBadge v-else-if="n.urgent" tone="danger">Urgent</UiBadge>
          <span class="text-label text-subtle">{{ when(n.time) }}</span>
        </div>
        <h2 class="mt-1 text-h3 font-semibold">{{ n.title }}</h2>
        <p class="text-muted">{{ n.body }}</p>
        <div v-if="link || n.url" class="mt-2 flex flex-wrap items-center gap-3">
          <UiButton v-if="link" size="sm" variant="secondary" :to="link.href">{{ link.label }} <ArrowRightIcon /></UiButton>
          <a v-if="n.url" :href="n.url" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-0.5 text-meta font-medium text-accent-ink">Read more on afriff.com <ArrowUpRightIcon class="size-4" /></a>
        </div>
      </article>
    </div>
  </div>
</template>
