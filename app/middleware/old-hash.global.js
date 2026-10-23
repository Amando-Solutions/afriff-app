// Links from the first version of the app used #/ addresses (e.g. /#/film/lady,
// /#/admin). Send them to the matching page so shared links keep working.
export default defineNuxtRouteMiddleware((to) => {
  if (to.hash?.startsWith('#/')) {
    return navigateTo({ path: to.hash.slice(1), query: to.query }, { replace: true })
  }
})
