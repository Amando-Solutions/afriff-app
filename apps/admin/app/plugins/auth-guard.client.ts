import { watch } from 'vue'
import { redirectFor } from '~/lib/access'
import { useAdminAuth } from '~/lib/useAdminAuth'

// The middleware only runs when someone changes page. This covers changes
// while they stay put: logging out, a sign-in finishing on /login, or an admin
// giving or removing a role on the Team page (the page moves on by itself).
export default defineNuxtPlugin({
  name: 'auth-guard',
  setup() {
    const auth = useAdminAuth()
    const router = useRouter()
    watch(
      () => [auth.loading, auth.user, auth.profile?.role, auth.error] as const,
      ([loading]) => {
        if (loading) return
        const route = router.currentRoute.value
        const target = redirectFor(route, auth)
        if (target && target !== route.fullPath) void navigateTo(target, { replace: true })
      },
    )
  },
})
