<template>
  <button type="button" class="app-action-tile" :disabled="disabled" @click="onClick">
    <span class="app-action-tile__glyph" aria-hidden="true">{{ glyph }}</span>
    <span class="app-action-tile__label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
/**
 * Design system: ActionTile — export tile: glyph over label, used in a 3-up grid under the
 * total card (⧉ 複製領款單 · ▣ 下載明細圖 · ↓ 匯出 CSV).
 */
const { glyph, label, disabled = false } = defineProps<{
  /** ⧉ copy · ▣ image · ↓ download */
  glyph: string;
  label: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{ click: [] }>();

const onClick = () => {
  if (!disabled) emit('click');
};
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* DS min-height 64 → height from content + padding (≈ 66px); radius 20; padding 8px 6px → 8px */
  .app-action-tile {
    @apply flex flex-col items-center justify-center gap-1 rounded-inset bg-surface p-2 cursor-pointer hover:enabled:bg-hover;
    transition: background-color 0.3s;
  }
  .app-action-tile__glyph { @apply text-lg leading-6 text-accent-text; }
  .app-action-tile__label { @apply text-helper text-ink; }
  .app-action-tile:disabled { @apply bg-soft cursor-not-allowed; }
  .app-action-tile:disabled .app-action-tile__glyph,
  .app-action-tile:disabled .app-action-tile__label { @apply text-faint; }
}
</style>
