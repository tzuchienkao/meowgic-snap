<template>
  <button
    type="button"
    class="app-button"
    :class="[`app-button--${variant}`, `app-button--${size}`, { 'app-button--full': full }]"
    :disabled="disabled"
    @click="onButtonClick"
  >
    <span v-if="icon" aria-hidden="true">{{ icon }}</span>
    <slot>{{ label }}</slot>
    <slot name="append"></slot>
  </button>
</template>

<script setup lang="ts">
/**
 * Design system: Button — fully rounded pill in the round font.
 * Text on accent is always dark (on-accent), never white; only danger has white text.
 * Content: default slot, or the `label` prop as a fallback.
 */
import type { ButtonSize, ButtonVariant } from './IButton';

const {
  label = '',
  variant = 'primary',
  size = 'lg',
  full = false,
  icon = '',
  disabled = false
} = defineProps<{
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  icon?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{ click: [] }>();

const onButtonClick = () => {
  if (!disabled) {
    emit('click');
  }
};
</script>

<!-- Not scoped and in the components layer, so callers can still adjust with utility classes. -->
<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .app-button {
    @apply inline-flex items-center justify-center gap-2 rounded-full whitespace-nowrap cursor-pointer;
    transition: background-color 0.3s, color 0.3s;
  }

  /* Sizes: font size + line height + vertical padding (4px grid), no fixed heights */
  .app-button--lg { @apply text-btn leading-6 py-3 px-7; }       /* 16 + 24 + 12·2 = 48 */
  .app-button--md { @apply text-body-sm leading-5 py-3 px-4; }   /* 14 + 20 + 12·2 = 44 */
  .app-button--sm { @apply text-btn-sm leading-5 py-2 px-4; }    /* 13 + 20 + 8·2 = 36 */
  .app-button--xs { @apply text-btn-sm leading-4 py-2 px-3; }    /* 13 + 16 + 8·2 = 32 */

  .app-button--full { @apply w-full; }

  /* Variants */
  .app-button--primary { @apply bg-accent text-on-accent; }
  .app-button--strong { @apply bg-strong text-strong-text hover:enabled:bg-strong-hover; }
  .app-button--secondary { @apply bg-soft text-ink; }
  .app-button--surface { @apply bg-surface text-ink hover:enabled:bg-hover; }
  .app-button--outline { @apply bg-surface text-ink ring-2 ring-inset ring-line hover:enabled:bg-hover; }
  .app-button--danger { @apply bg-danger text-on-danger; }

  /* Disabled: solid soft fill + faint text, no opacity (DS: no semi-transparent text) */
  .app-button:disabled { @apply bg-soft text-faint ring-0 cursor-not-allowed; }
}
</style>
