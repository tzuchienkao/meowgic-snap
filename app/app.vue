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

const { agentMode, setAgentMode, initAgentMode, cleanupAgentMode } = useAgent();
const { theme, loadSavedTheme } = useTheme();
const { user, initAuth } = useAuth();
const { toastMessage, isToastVisible } = useToast();

const isAuthReady = ref(false)

// <html data-theme> follows the derived theme: guests light, members their saved choice.
useHead({ htmlAttrs: { 'data-theme': theme } });

onMounted(async () => {
  loadSavedTheme();
  initAgentMode();
  await initAuth();
  setAgentMode();
  isAuthReady.value = true;
});

onBeforeUnmount(() => {
  cleanupAgentMode();
});

const layout = computed(() => {
  if (isAuthReady.value && user.value) {
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
