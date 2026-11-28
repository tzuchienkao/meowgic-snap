<template>
  <app-illustration-slot class="app-empty-state" :label="label" radius="card" :stripe="EMPTY_STATE_STRIPE">
    <!-- The illustration (an <img> with alt); without one, `label` marks where it will go -->
    <slot />
    <p class="app-empty-state__message">{{ message }}</p>
    <slot name="actions" />
  </app-illustration-slot>
</template>

<script setup lang="ts">
/**
 * Nothing to show (or it could not be loaded): a cat illustration, one line of copy and an
 * optional button. Pages put it in a CatEarCard.
 */
const { message, label } = defineProps<{
  message: string;
  /** Placeholder text while the illustration is missing, e.g. "貓咪插畫：翻開空白的紀錄本" */
  label?: string;
}>();

/** IllustrationSlot: empty states use 10px stripes */
const EMPTY_STATE_STRIPE = 10;
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* Doubled class: beats IllustrationSlot's own padding / height whichever stylesheet loads first */
  .app-empty-state.app-illustration-slot { @apply p-6 min-h-70; }
  .app-empty-state__message { @apply text-lg; }
}
</style>
