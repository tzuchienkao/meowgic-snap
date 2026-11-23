<template>
  <span class="app-chip" :class="`app-chip--${tone}`"><slot /></span>
</template>

<script setup lang="ts">
/**
 * Design system: Chip — small static pill for counters and meta (已貼 3 / 1,000 筆).
 * Not interactive (use FilterChip for toggles).
 */
const { tone = 'soft' } = defineProps<{
  tone?: 'soft' | 'surface' | 'warn' | 'hero' | 'accent';
}>();
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* DS padding 3px 12px → 4px 12px (4px grid) */
  .app-chip { @apply inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap; }

  .app-chip--soft { @apply bg-soft text-muted; }
  .app-chip--surface { @apply bg-surface text-muted; }
  .app-chip--warn { @apply bg-warn-bg text-warn-text; }
  .app-chip--hero { @apply bg-hero-chip text-hero-chip-text; }
  .app-chip--accent { @apply bg-accent text-on-accent; }
}
</style>
