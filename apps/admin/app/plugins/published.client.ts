// The console shows venue names and the festival days from the published
// festival data (the same feed the attendee app uses, in @afriff/core), so
// what staff see stays in step with what was last published.
import { loadSavedCopy, startPublishedFeed } from '@afriff/core/published'

export default defineNuxtPlugin({
  name: 'published-data',
  setup(nuxtApp) {
    loadSavedCopy()
    nuxtApp.hook('app:mounted', () => void startPublishedFeed())
  },
})
