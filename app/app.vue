<template>
  <NuxtLayout :name="layout">
    <NuxtPage />
  </NuxtLayout>
  <!-- Always-present live region so screen readers announce every toast; the visible pill is hidden from them -->
  <div class="sr-only" role="status" aria-live="polite">{{ isToastVisible ? toastMessage : '' }}</div>
  <Transition name="toast">
    <app-toast v-if="isToastVisible" fixed aria-hidden="true">{{ toastMessage }}</app-toast>
  </Transition>
</template>

<script setup lang="ts">
import { useAgent } from '~/composables/useAgent.ts'
import { useTheme } from "~/composables/useTheme.ts";
import { useAuth } from "~/composables/useAuth.ts";
import { useToast } from "~/composables/useToast.ts";
import { usePreferences } from "~/composables/usePreferences";

const { agentMode, setAgentMode, initAgentMode, cleanupAgentMode } = useAgent();
const { theme, loadSavedTheme } = useTheme();
const { user, initAuth } = useAuth();
const { toastMessage, isToastVisible } = useToast();
const { loadPreferences } = usePreferences();

// <html data-theme> follows the derived theme: guests light, members their saved choice.
useHead({ htmlAttrs: { 'data-theme': theme } });

onMounted(async () => {
  loadSavedTheme();
  initAgentMode();
  // Correct the server's user-agent guess with the real width before anything awaits
  setAgentMode();
  // `user` already came from SSR (plugins/02.auth.ts); re-check the session in the browser
  await initAuth();
  // Auth state is known now: load the guest's and (when signed in) the member's 偏好設定
  await loadPreferences();
});

onBeforeUnmount(() => {
  cleanupAgentMode();
});

// `user` is known during SSR (session cookie), so the first HTML already has the right layout
const layout = computed(() => {
  if (user.value) {
    return agentMode.value === 'mobile' ? 'mobile-default' : 'desktop-default'
  } else {
    return 'desktop-landing';
  }
})
</script>

<style>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>
