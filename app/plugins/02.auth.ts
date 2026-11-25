/**
 * Resolve who is signed in during SSR, from the session cookie, so the first HTML already uses the
 * right layout (member vs guest). The `user` state is sent to the browser with the page, and
 * app.vue's onMounted initAuth() re-checks it there.
 */
export default defineNuxtPlugin(async () => {
  if (import.meta.server) {
    await useAuth().initAuth()
  }
})
