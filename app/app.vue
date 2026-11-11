<template>
  <ClientOnly v-if="user">
    <NuxtLayout :name="layout">
      <NuxtPage />
    </NuxtLayout>
  </ClientOnly>
  <NuxtLayout v-else :name="layout">
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useAgent } from '~/composables/useAgent.ts'
import { useTheme } from "~/composables/useTheme.ts";
import { useAuth } from "~/composables/useAuth.ts";

const { agentMode, setAgentMode, initAgentMode, cleanupAgentMode } = useAgent();
const { initTheme } = useTheme();
const { user, initAuth } = useAuth();

// Initialize theme immediately to prevent flash
initTheme();
await initAuth();

if (import.meta.client) {
  setAgentMode();
}

onMounted(() => {
  initAgentMode();
});

onBeforeUnmount(() => {
  cleanupAgentMode();
});

const layout = computed(() => {
  if (user.value) {
    return agentMode.value === 'mobile' ? 'mobile-default' : 'desktop-default'
  } else {
    return 'desktop-landing';
  }
})
</script>

<style>
</style>
