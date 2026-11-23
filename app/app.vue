<template>
  <NuxtLayout :name="layout">
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useAgent } from '~/composables/useAgent.ts'
import { useTheme } from "~/composables/useTheme.ts";
import { useAuth } from "~/composables/useAuth.ts";

const { agentMode, setAgentMode, initAgentMode, cleanupAgentMode } = useAgent();
const { theme, loadSavedTheme } = useTheme();
const { user, initAuth } = useAuth();

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
</style>
