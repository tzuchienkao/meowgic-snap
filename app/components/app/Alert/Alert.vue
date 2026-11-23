<template>
  <div v-if="tone === 'success'" class="app-alert app-alert--success" role="status">
    <span class="app-alert__check" aria-hidden="true">✓</span>
    <span class="app-alert__message"><slot /></span>
    <app-icon-button
      v-if="closable"
      label="關閉提示"
      glyph="×"
      tone="soft"
      @click="emit('close')"
    />
  </div>
  <div v-else class="app-alert app-alert--warn" role="alert">
    <p v-if="title || $slots.title" class="app-alert__title"><slot name="title">{{ title }}</slot></p>
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Design system: Alert.
 * warn (default) — peach-red inline box for format errors / remainder, bold first line (title), role="alert".
 * success — white banner with ✓ and an optional close button, role="status".
 */
const {
  tone = 'warn',
  title = '',
  closable = false
} = defineProps<{
  tone?: 'warn' | 'success';
  /** Bold first line (warn only), e.g. "喵？有幾行看不懂 (ΦдΦ)" */
  title?: string;
  /** success only — shows a × button that emits close */
  closable?: boolean;
}>();

const emit = defineEmits<{ close: [] }>();
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* warn: DS radius 16, padding 10px 14px → 12px 16px */
  .app-alert--warn { @apply flex flex-col gap-1 rounded-row bg-warn-bg px-4 py-3 text-sm text-warn-text; }
  .app-alert__title { @apply font-bold; }

  /* success: DS radius 22 → 24, padding 10 10 10 18 → 8 8 8 16 */
  .app-alert--success { @apply flex items-center gap-3 rounded-3xl bg-surface py-2 pr-2 pl-4; }
  .app-alert__check { @apply flex flex-none items-center justify-center w-7 h-7 rounded-full bg-ok-bg text-ok-text text-body-sm font-bold; }
  .app-alert__message { @apply flex-1 text-base text-ink; }
}
</style>
