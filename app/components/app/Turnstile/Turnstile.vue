<template>
  <div ref="container" class="app-turnstile" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { loadTurnstile } from '~/utils/turnstile';

/**
 * Cloudflare Turnstile (人機驗證) for Supabase Auth's Captcha protection.
 * Emits `verify` with a token to send along with the request; a token works once, so the parent
 * calls `reset()` after each request to get a new one. `expire` / `error` mean there is no valid
 * token any more.
 */
const { siteKey } = defineProps<{ siteKey: string }>();
const emit = defineEmits<{
  verify: [token: string];
  expire: [];
  error: [];
}>();

const container = ref<HTMLElement | null>(null);
let widgetId: string | undefined;
let isUnmounted = false;

onMounted(async () => {
  try {
    const turnstile = await loadTurnstile();
    if (isUnmounted || !container.value) return;
    widgetId = turnstile.render(container.value, {
      sitekey: siteKey,
      size: 'flexible',
      theme: 'light',
      language: 'zh-tw',
      callback: (token) => emit('verify', token),
      'expired-callback': () => emit('expire'),
      'error-callback': () => emit('error'),
    });
  } catch (err) {
    console.error('Turnstile load error:', err);
    emit('error');
  }
});

onBeforeUnmount(() => {
  isUnmounted = true;
  if (widgetId !== undefined) window.turnstile?.remove(widgetId);
});

/** Ask for a new token (the last one was used or refused) */
const reset = () => {
  if (widgetId !== undefined) window.turnstile?.reset(widgetId);
};

defineExpose({ reset });
</script>

<style>
@reference "~/assets/css/main.css";
@layer theme, base, components, utilities;

@layer components {
  /* Turnstile draws a 65px-high iframe; keep its space so the dialog doesn't jump when it appears */
  .app-turnstile { @apply w-full min-h-[65px]; }
}
</style>
