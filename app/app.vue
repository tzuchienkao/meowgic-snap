<template>
  <ClientOnly>
  </ClientOnly>
  <NuxtLayout :name="layout">
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useTheme } from "~/composables/useTheme.ts";
import { useAuth } from "~/composables/useAuth.ts";

const { initTheme } = useTheme();
const { user, initAuth } = useAuth();

// Initialize theme immediately to prevent flash
initTheme();
await initAuth();

const layout = computed(() => {
  return user.value ? 'desktop-default' : 'desktop-landing';
})
</script>

<style>
</style>
