<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { ArrowRightIcon, BellIcon } from 'lucide-vue-next'
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

// each item with its tag and "View" link worked out once
const items = computed(() => NEWS.map((n) => {
  const tag = n.type ? NEWS_TAGS[n.type] : undefined
  return { n, tag, link: newsLink(n), alert: Boolean(n.urgent || tag?.tone === 'alert') }
}))
</script>

<template>
  <div class="page">
    <PageTitle title="News & alerts" :icon="BellIcon" />
    <p class="muted">Changes to screenings and events, and festival news. Newest first.</p>
    <AlertsSwitch />
    <p v-if="NEWS.length === 0" class="empty">No news yet. Changes to the programme will appear here.</p>
    <div class="stack" style="margin-top: 16px">
      <article v-for="{ n, tag, link, alert } in items" :key="n.id" class="news-card" :class="{ urgent: alert }">
        <div class="news-tags">
          <span v-if="tag" class="label" :class="`tone-${tag.tone}`">{{ tag.text }}</span>
          <span v-else-if="n.urgent" class="label tone-alert">Urgent</span>
        </div>
        <h2 class="row-title news-title">{{ n.title }}</h2>
        <p class="muted">{{ n.body }}</p>
        <span class="muted small">{{ when(n.time) }}</span>
        <NuxtLink v-if="link" class="btn btn-outline btn-small" :to="link.href">{{ link.label }} <ArrowRightIcon :size="16" /></NuxtLink>
        <a v-if="n.url" class="link" :href="n.url" target="_blank" rel="noopener noreferrer">Read more on afriff.com →</a>
      </article>
    </div>
  </div>
</template>
