// Push notifications ("Alerts on this phone", lib/push.ts), set up as the app starts.
import { configurePush, refreshAlerts } from '~/lib/push'

export default defineNuxtPlugin({
  name: 'push',
  setup(nuxtApp) {
    configurePush(nuxtApp.$config.public)

    // A notification tapped while the app is already open: the service worker
    // brings it forward and says where to go (public/push-sw.js).
    navigator.serviceWorker?.addEventListener('message', (event) => {
      const msg = event.data as { type?: string; path?: unknown } | null
      if (msg?.type === 'afriff:open' && typeof msg.path === 'string' && msg.path.startsWith('/')) void nuxtApp.$router.push(msg.path)
    })

    // Well after the first screen: check alerts are still on and this phone's push address is current.
    nuxtApp.hook('app:mounted', () => {
      setTimeout(() => void refreshAlerts(), 8000)
    })
  },
})
