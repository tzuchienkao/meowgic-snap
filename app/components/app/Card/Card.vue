<template>
  <div class="app-card" :class="[`app-card--${tone}`, `app-card--${radius}`]">
    <div v-if="title || $slots.title || $slots.aside" class="app-card__header">
      <span class="app-card__title"><slot name="title">{{ title }}</slot></span>
      <span v-if="$slots.aside" class="app-card__aside"><slot name="aside" /></span>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Design system: Card — flat, borderless, no shadow. White on the cream page background.
 * Use for regular content; reserve CatEarCard (cat ears) for the 1–2 most important cards per page.
 * radius: main 28px · sub 24px (DS secondary 24 / tiles 22, rounded to the 4px grid).
 */
const {
  title = '',
  tone = 'surface',
  radius = 'main'
} = defineProps<{
  title?: string;
  tone?: 'surface' | 'soft' | 'hero';
  radius?: 'main' | 'sub';
}>();
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .app-card { @apply flex flex-col gap-4 p-6; }

  .app-card--main { @apply rounded-card; }
  .app-card--sub { @apply rounded-3xl; }

  .app-card--surface { @apply bg-surface text-ink; }
  .app-card--soft { @apply bg-soft text-ink; }
  .app-card--hero { @apply bg-hero text-hero-text; }

  .app-card__header { @apply flex flex-wrap items-baseline justify-between gap-3; }
  .app-card__title { @apply text-lg; }
  .app-card__aside { @apply text-helper text-muted; }
}
</style>
