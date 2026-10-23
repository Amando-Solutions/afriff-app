// Runs once when the app starts, before the first screen is drawn.
import { checkForUpdates, loadSavedCopy } from '~/lib/liveData.js'
import { startLiveQueues } from '~/lib/queues.js'

export default defineNuxtPlugin((nuxtApp) => {
  // Use the festival data saved on this phone last time, before anything shows.
  loadSavedCopy()

  // the console and the door view don't need the attendees' live queue feed
  const onAdmin = () => /^\/(admin|door)(\/|$)/.test(window.location.pathname)

  // Look for newly published festival data now, every 5 minutes, and when the app is reopened.
  nuxtApp.hook('app:mounted', () => {
    checkForUpdates()
    setInterval(checkForUpdates, 5 * 60 * 1000)
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkForUpdates())
    // live queue counts from door volunteers (festival days only; not on the console or the door view)
    if (!onAdmin()) startLiveQueues()
  })
})
