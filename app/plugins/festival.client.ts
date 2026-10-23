// Runs once when the app starts, before the first screen is drawn.
import { loadSavedCopy, startPublishedFeed } from '~/lib/liveData'
import { startLiveQueues } from '~/lib/queues'

export default defineNuxtPlugin({
  name: 'festival',
  setup(nuxtApp) {
    // Use the festival data saved on this phone last time, before anything shows.
    loadSavedCopy()

    // the console and the door view don't need the attendees' live queue feed
    const onAdmin = () => /^\/(admin|door)(\/|$)/.test(window.location.pathname)

    // Once the first screen is showing, connect to Firestore (the SDK is
    // downloaded now, not before first paint) and follow published data and
    // live queue counts. Both answer from the phone's cache when offline and
    // catch up by themselves when the connection is back.
    nuxtApp.hook('app:mounted', () => {
      void startPublishedFeed()
      if (!onAdmin()) startLiveQueues()
    })
  },
})
