<template>
  <button
    type="button"
    class="app-record-row"
    :class="{ 'app-record-row--selected': selected }"
    :aria-current="selected || undefined"
    @click="emit('click')"
  >
    <span class="app-record-row__text">
      <span class="app-record-row__name">{{ name }}</span>
      <span class="app-record-row__meta">{{ date }}<template v-if="meta"> · {{ meta }}</template></span>
    </span>
    <span class="app-record-row__amount">{{ amount }}</span>
    <span v-if="chevron" class="app-record-row__chevron" aria-hidden="true">›</span>
  </button>
</template>

<script setup lang="ts">
/**
 * Design system: RecordRow — list row for past exchanges on 儀表板 and 紀錄; stack with an 8px gap
 * inside a white Card. Soft fill; selected = strong (dark) fill. chevron = row opens the record.
 */
const {
  name,
  date,
  meta = '',
  amount,
  selected = false,
  chevron = false
} = defineProps<{
  name: string;
  /** Pre-formatted, e.g. "2026/10/17" */
  date: string;
  /** Extra info after the date, e.g. "12 筆" */
  meta?: string;
  /** Pre-formatted with thousands separators, e.g. "96,300" */
  amount: string;
  selected?: boolean;
  chevron?: boolean;
}>();

const emit = defineEmits<{ click: [] }>();
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* DS min-height 64 / padding 10px 14px → height from 12px padding + 24 + 16 lines = 64, px 16 */
  .app-record-row {
    @apply flex w-full items-center gap-3 rounded-inset bg-soft px-4 py-3 text-left cursor-pointer;
  }
  .app-record-row--selected { @apply bg-strong; }

  /* DS gap 2 → 0 (4px grid; line heights give the breathing room) */
  .app-record-row__text { @apply flex min-w-0 flex-1 flex-col; }
  .app-record-row__name { @apply truncate text-body-md leading-6 font-medium text-ink; }
  .app-record-row__meta { @apply text-xs text-muted; }
  .app-record-row__amount { @apply text-lg whitespace-nowrap text-ink; }
  .app-record-row__chevron { @apply text-sm text-faint; }

  .app-record-row--selected .app-record-row__name,
  .app-record-row--selected .app-record-row__amount { @apply text-strong-text; }
  .app-record-row--selected .app-record-row__meta { @apply text-strong-text; }
}
</style>
