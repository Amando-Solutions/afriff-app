<script setup>
import { onMounted } from 'vue'
import { ArrowRightIcon, ArrowUpRightIcon, BellIcon } from 'lucide-vue-next'
import { NEWS } from '~/data/programme.js'
import { NEWS_TAGS, markAllNewsSeen, newsLink } from '~/lib/alerts.js'

// NEWS & ALERTS: changes to screenings and events, and festival news. Newest first.
useHead({ title: 'News & alerts' })
// opening News clears the count on the bell
onMounted(markAllNewsSeen)

const when = (iso) => {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
  } catch {
    return ''
  }
}
const TONE = { alert: 'danger', gold: 'accent', muted: 'neutral' }
</script>

<template>
  <div>
    <PageTitle title="News & alerts" :icon="BellIcon" description="Changes to screenings and events, and festival news. Newest first." />
    <UiEmptyState v-if="NEWS.length === 0" :icon="BellIcon" title="No news yet" description="Changes to the programme will appear here." />
    <div class="mt-5 flex flex-col gap-3">
      <article
        v-for="n in NEWS"
        :key="n.id"
        class="card flex flex-col gap-1.5 p-4"
        :class="(n.urgent || NEWS_TAGS[n.type]?.tone === 'alert') && 'border-danger/40'"
      >
        <div class="flex gap-1.5">
          <UiBadge v-if="NEWS_TAGS[n.type]" :tone="TONE[NEWS_TAGS[n.type].tone]">{{ NEWS_TAGS[n.type].text }}</UiBadge>
          <UiBadge v-else-if="n.urgent" tone="danger">Urgent</UiBadge>
        </div>
        <h2 class="text-h3 font-semibold">{{ n.title }}</h2>
        <p class="text-muted">{{ n.body }}</p>
        <span class="text-label text-subtle">{{ when(n.time) }}</span>
        <div v-if="newsLink(n) || n.url" class="mt-1 flex flex-wrap items-center gap-3">
          <UiButton v-if="newsLink(n)" size="sm" variant="secondary" :to="newsLink(n).href">{{ newsLink(n).label }} <ArrowRightIcon /></UiButton>
          <a v-if="n.url" :href="n.url" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-0.5 text-meta font-medium text-accent-ink">Read more on afriff.com <ArrowUpRightIcon class="size-4" /></a>
        </div>
      </article>
    </div>
  </div>
</template>
