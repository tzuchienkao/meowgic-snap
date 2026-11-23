<template>
  <span class="app-denom-badge" :class="[`app-denom-badge--${size}`, onSurface ? 'app-denom-badge--on-surface' : 'app-denom-badge--on-soft']"><span class="app-denom-badge__value">NT${{ formatted(value) }}</span> <span class="app-denom-badge__count" :class="`app-denom-badge__count--${resolvedKind}`">{{ formatted(count) }} <span class="app-denom-badge__unit">{{ resolvedKind === 'bill' ? '張' : '個' }}</span></span></span>
</template>

<script setup lang="ts">
/**
 * Design system: DenomBadge — "NT$面額 + N 張/個" pill. Bill count on bill-chip, coin count on
 * coin-chip. Never write ×N; only list counts > 0 (the caller filters zeros).
 * size: sm (每筆明細) · md (這次要準備的現金). onSurface: white pill (inside soft rows) or soft pill (inside white cards).
 */
import { computed } from 'vue';
import { isBill } from '~/utils/moneyParser';

const {
  value,
  count,
  kind,
  size = 'sm',
  onSurface = true
} = defineProps<{
  value: number;
  count: number;
  /** Inferred from value (>= 100 → bill) when omitted */
  kind?: 'bill' | 'coin';
  size?: 'sm' | 'md';
  onSurface?: boolean;
}>();

const resolvedKind = computed(() => kind ?? (isBill(value) ? 'bill' : 'coin'));
const formatted = (n: number) => n.toLocaleString('en-US');
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* DS padding 3 3 3 12 / 4 4 4 14 → 4 4 4 12 / 4 4 4 16; heights from line height + padding */
  .app-denom-badge { @apply inline-flex items-center gap-2 rounded-full whitespace-nowrap; }
  .app-denom-badge--sm { @apply py-1 pr-1 pl-3; }
  .app-denom-badge--md { @apply p-1 pl-4; }
  .app-denom-badge--on-surface { @apply bg-surface; }
  .app-denom-badge--on-soft { @apply bg-soft; }

  .app-denom-badge__value { @apply text-body-sm font-medium text-ink-2; }

  .app-denom-badge__count { @apply inline-flex items-center gap-1 rounded-full px-3 text-btn text-ink; }
  .app-denom-badge--sm .app-denom-badge__count { @apply leading-6; }   /* 24 (DS 26) */
  .app-denom-badge--md .app-denom-badge__count { @apply leading-7; }   /* 28 (DS 30) */
  .app-denom-badge__count--bill { @apply bg-bill-chip; }
  .app-denom-badge__count--coin { @apply bg-coin-chip; }
  .app-denom-badge__unit { @apply text-xs; }
}
</style>
