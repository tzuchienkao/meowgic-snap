<template>
  <button
    type="button"
    class="app-icon-button"
    :class="[`app-icon-button--${tone}`, `app-icon-button--${size}`]"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    @click="onClick"
  >
    <span class="app-icon-button__glyph" aria-hidden="true">{{ glyph }}</span>
  </button>
</template>

<script setup lang="ts">
/**
 * Design system: IconButton — round icon button (theme toggle ☾/☀, menu ☰, close ×, pager ‹ ›).
 * Always pass an accessible `label` (used for aria-label and title).
 * md 44px (default) · sm 40px (pagination) — size from glyph box + padding on the 4px grid.
 */
const {
  label,
  glyph,
  tone = 'surface',
  size = 'md',
  disabled = false
} = defineProps<{
  label: string;
  glyph: string;
  tone?: 'surface' | 'soft' | 'strong';
  size?: 'md' | 'sm';
  disabled?: boolean;
}>();

const emit = defineEmits<{ click: [] }>();

const onClick = () => {
  if (!disabled) {
    emit('click');
  }
};
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .app-icon-button {
    @apply inline-flex flex-none items-center justify-center rounded-full cursor-pointer text-lg;
    transition: background-color 0.3s, color 0.3s;
  }

  /* Glyph box (square) + padding → round button without a fixed height */
  .app-icon-button__glyph { @apply block text-center; }
  .app-icon-button--md { @apply p-3; }                                   /* 20 + 12·2 = 44 */
  .app-icon-button--md .app-icon-button__glyph { @apply w-5 leading-5; }
  .app-icon-button--sm { @apply p-2; }                                   /* 24 + 8·2 = 40 */
  .app-icon-button--sm .app-icon-button__glyph { @apply w-6 leading-6; }

  .app-icon-button--surface { @apply bg-surface text-ink hover:enabled:bg-hover; }
  .app-icon-button--soft { @apply bg-soft text-ink; }
  .app-icon-button--strong { @apply bg-strong text-strong-text hover:enabled:bg-strong-hover; }

  .app-icon-button:disabled { @apply bg-soft text-faint cursor-not-allowed; }
}
</style>
