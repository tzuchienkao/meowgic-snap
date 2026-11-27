<template>
  <button type="button" class="app-filter-chip" :class="{ 'app-filter-chip--pressed': pressed }" :aria-pressed="pressed" @click="emit('click')">
    <span class="app-filter-chip__label"><slot>{{ label }}</slot></span>
  </button>
</template>

<script setup lang="ts">
/**
 * Design system: FilterChip — pressable range / filter chip (e.g. 查詢區間 近 1 個月 / 近 3 個月 / 近半年).
 * Soft fill; pressed = nav-active (dark ink in light theme, cat-eye yellow in dark theme), with aria-pressed.
 */
const { label = '', pressed = false } = defineProps<{
  label?: string;
  pressed?: boolean;
}>();

const emit = defineEmits<{ click: [] }>();
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* DS height 36 / padding 0 14 → 8px padding + 20px line = 36, px 16 */
  .app-filter-chip {
    @apply rounded-full bg-soft px-4 py-2 text-sm whitespace-nowrap text-ink cursor-pointer;
    transition: background-color 0.3s, color 0.3s;
  }
  .app-filter-chip:not(.app-filter-chip--pressed):hover { @apply bg-hover; }
  .app-filter-chip--pressed { @apply bg-nav-active text-nav-active-text; }
}
</style>
