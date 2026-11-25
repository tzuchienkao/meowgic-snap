<template>
  <div
    class="app-illustration-slot"
    :class="`app-illustration-slot--${radius}`"
    :style="{ '--stripe': `${stripe}px` }"
  >
    <span v-if="label" class="app-illustration-slot__label">{{ label }}</span>
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Design system: IllustrationSlot — diagonal-stripe placeholder marking where a cat
 * illustration will go; the label says what goes there. Size it with classes (e.g. min-h-30).
 * Deviation: label is 12px (DS 11px) to match the current home placeholder.
 */
const {
  label,
  stripe = 8,
  radius = 'tile'
} = defineProps<{
  /** e.g. "貓咪插畫：被一疊鈔票壓住"; omit it when the slot shows the real illustration (an <img> with alt) */
  label?: string;
  /** stripe width in px: 6 logo · 8 dialogs · 10 empty states */
  stripe?: number;
  /** tile 24px (DS 22) · card 28px */
  radius?: 'tile' | 'card';
}>();
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .app-illustration-slot {
    @apply flex flex-col items-center justify-center gap-3 p-4 text-center text-muted min-h-30;
    background: repeating-linear-gradient(45deg, var(--ms-stripe-a) 0 var(--stripe), var(--ms-stripe-b) var(--stripe) calc(var(--stripe) * 2));
  }
  .app-illustration-slot--tile { @apply rounded-3xl; }
  .app-illustration-slot--card { @apply rounded-card; }
  .app-illustration-slot__label { @apply font-mono text-xs; }
}
</style>
