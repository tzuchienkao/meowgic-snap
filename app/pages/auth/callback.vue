<template>
  <div v-if="errorMessage" class="auth-callback">
    <app-alert title="登入失敗">{{ errorMessage }}</app-alert>
    <p class="auth-callback__hint">回到首頁，按右上角的「登入」就能再寄一次。</p>
    <app-button variant="strong" label="回首頁" @click="onHomeClick" />
  </div>
  <div v-else class="p-6 text-center text-muted" role="status">登入中...</div>
</template>

<script setup lang="ts">
import { CALLBACK_ERROR_MESSAGES } from '~/constants/auth';
import { RouteName } from '~/constants/navigation';
import { usePreferences } from '~/composables/usePreferences';
import { getSupabaseErrorKind, SupabaseErrorKind } from '~/utils/supabaseErrors';

definePageMeta({
  middleware: [
    // Magic link (PKCE): exchange ?code= for the session cookie on the server and redirect, so the
    // page holding the code is never rendered (nor reported to GA). The code verifier was saved as
    // a cookie by the browser that asked for the link. If this fails (e.g. the link was opened in
    // another browser), the page renders and the browser client tries once more on its own.
    async (to) => {
      if (!import.meta.server || typeof to.query.code !== 'string') return;
      // Inline middleware gets no automatic async context: after the await, Nuxt composables
      // (navigateTo) no longer find the app, so take it first and run them inside its context.
      const nuxtApp = useNuxtApp();
      const { error } = await nuxtApp.$supabase.auth.exchangeCodeForSession(to.query.code);
      if (error) {
        console.error('Exchange code error:', error);
        return;
      }
      return nuxtApp.runWithContext(() => navigateTo('/', { redirectCode: 302 }));
    },
  ],
});

const route = useRoute();
const { user, initAuth } = useAuth();
const { loadPreferences } = usePreferences();

const errorMessage = ref('');

/** Supabase sends a refused link back with ?error_code= (PKCE) or #error_code= (implicit flow) */
const linkErrorCode = (): string | null => {
  if (typeof route.query.error_code === 'string') return route.query.error_code;
  if (typeof route.query.error === 'string') return route.query.error;
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return hash.get('error_code') ?? hash.get('error');
};

const toCallbackMessage = (code: string) =>
  getSupabaseErrorKind({ code }) === SupabaseErrorKind.Expired
    ? CALLBACK_ERROR_MESSAGES.expired
    : CALLBACK_ERROR_MESSAGES.failed;

onMounted(async () => {
  const code = linkErrorCode();
  if (code) {
    errorMessage.value = toCallbackMessage(code);
    return;
  }
  await initAuth();
  // Still a guest: the code could not be exchanged (e.g. the link was opened in another browser)
  if (!user.value) {
    errorMessage.value = CALLBACK_ERROR_MESSAGES.failed;
    return;
  }
  // Just signed in: load this member's 偏好設定 before showing the app
  await loadPreferences();
  await navigateTo('/');
});

const onHomeClick = () => navigateTo({ name: RouteName.Index });
</script>

<style scoped>
@reference "~/assets/css/main.css";

.auth-callback {
  @apply mx-auto flex max-w-100 flex-col items-center gap-4 px-4 py-12 text-center;
}
.auth-callback__hint {
  @apply text-body-md text-muted;
}
</style>
