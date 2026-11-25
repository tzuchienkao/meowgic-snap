<template>
  <div class="p-6 text-center text-muted">登入中...</div>
</template>

<script setup lang="ts">
import { usePreferences } from '~/composables/usePreferences'

definePageMeta({
  middleware: [
    // Magic link (PKCE): exchange ?code= for the session cookie on the server and redirect, so the
    // page holding the code is never rendered (nor reported to GA). The code verifier was saved as
    // a cookie by the browser that asked for the link. If this fails (e.g. the link was opened in
    // another browser), the page renders and the browser client tries once more on its own.
    async (to) => {
      if (!import.meta.server || typeof to.query.code !== 'string') return
      // Inline middleware gets no automatic async context: after the await, Nuxt composables
      // (navigateTo) no longer find the app, so take it first and run them inside its context.
      const nuxtApp = useNuxtApp()
      const { error } = await nuxtApp.$supabase.auth.exchangeCodeForSession(to.query.code)
      if (error) {
        console.error('Exchange code error:', error)
        return
      }
      return nuxtApp.runWithContext(() => navigateTo('/', { redirectCode: 302 }))
    },
  ],
})

const { initAuth } = useAuth()
const { loadPreferences } = usePreferences()

onMounted(async () => {
  await initAuth()
  // Just signed in: load this member's 偏好設定 before showing the app
  await loadPreferences()
  await navigateTo('/')
})
</script>
