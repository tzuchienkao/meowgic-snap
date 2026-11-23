<template>
  <div class="app-cat-ear-card" :class="[`app-cat-ear-card--${tone}`, `app-cat-ear-card--${size}`]">
    <span class="app-cat-ear-card__ear app-cat-ear-card__ear--left" aria-hidden="true" />
    <span class="app-cat-ear-card__ear app-cat-ear-card__ear--right" aria-hidden="true" />
    <div class="app-cat-ear-card__body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Design system: CatEarCard — the brand's signature card with two rounded-diamond cat ears
 * 28px from each side. Max 1–2 per page (input card, total card, dialogs); use Card otherwise.
 * tone: surface = white card · hero = dark 總額卡 (ink in light theme, surface in dark theme).
 * size: card (default) · dialog = ears 36px from the sides and a 30px radius (used by Dialog).
 */
const { tone = 'surface', size = 'card' } = defineProps<{
  tone?: 'surface' | 'hero';
  size?: 'card' | 'dialog';
}>();
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* mt-3 leaves room for the ears, which stick out 12px above the card */
  .app-cat-ear-card { @apply relative mt-3; }

  .app-cat-ear-card__ear {
    @apply absolute -top-3 w-7 h-7 rounded-sm rotate-45;
  }
  .app-cat-ear-card__ear--left { @apply left-7; }
  .app-cat-ear-card__ear--right { @apply right-7; }

  .app-cat-ear-card__body {
    @apply relative flex flex-col gap-4 p-6 rounded-card;
  }

  /* Dialog: DS ears 30px / inset 36px / radius 30px → ears stay 28px (4px grid), inset 36px */
  .app-cat-ear-card--dialog .app-cat-ear-card__ear--left { @apply left-9; }
  .app-cat-ear-card--dialog .app-cat-ear-card__ear--right { @apply right-9; }
  .app-cat-ear-card--dialog .app-cat-ear-card__body { @apply rounded-dialog; }

  .app-cat-ear-card--surface .app-cat-ear-card__ear,
  .app-cat-ear-card--surface .app-cat-ear-card__body { @apply bg-surface; }
  .app-cat-ear-card--surface .app-cat-ear-card__body { @apply text-ink; }

  .app-cat-ear-card--hero .app-cat-ear-card__ear,
  .app-cat-ear-card--hero .app-cat-ear-card__body { @apply bg-hero; }
  .app-cat-ear-card--hero .app-cat-ear-card__body { @apply text-hero-text; }
}
</style>
