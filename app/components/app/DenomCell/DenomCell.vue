<template>
  <div class="app-denom-cell" :class="[`app-denom-cell--${kind}`, `app-denom-cell--${resolvedState}`, { 'app-denom-cell--compact': compact }]">
    <span class="app-denom-cell__value">NT${{ formatted(value) }}</span>
    <span class="app-denom-cell__count">{{ formatted(count) }}</span>
    <span v-if="kind === 'bill' && !compact" class="app-denom-cell__unit">張</span>
  </div>
</template>

<script setup lang="ts">
/**
 * Design system: DenomCell — denomination summary cell. Bills = rounded square, coins = circle,
 * always prefixed "NT$". state: top = most-used bill (accent) · has = peach · zero = dashed & faint
 * (defaults from count). compact = dashboard size (no 張).
 */
import { computed } from 'vue';

const {
  kind = 'bill',
  value,
  count,
  state,
  compact = false
} = defineProps<{
  kind?: 'bill' | 'coin';
  value: number;
  count: number;
  state?: 'top' | 'has' | 'zero';
  compact?: boolean;
}>();

const resolvedState = computed(() => state ?? (count > 0 ? 'has' : 'zero'));
const formatted = (n: number) => n.toLocaleString('en-US');
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* Every state has a 2px border (transparent unless zero) so heights match without off-grid padding */
  .app-denom-cell { @apply flex flex-col items-center justify-center border-2 border-transparent; }

  /* Bills: DS radius 22 / compact 20 → 24 / 20; padding 12px 6px → 12px 8px */
  .app-denom-cell--bill { @apply rounded-3xl px-2 py-3; }
  .app-denom-cell--bill.app-denom-cell--compact { @apply rounded-inset py-2; }
  .app-denom-cell--bill .app-denom-cell__value { @apply text-xs font-medium; }
  .app-denom-cell--bill .app-denom-cell__count { @apply text-2xl; }                         /* 28 */
  .app-denom-cell--bill.app-denom-cell--compact .app-denom-cell__count { @apply text-xl; }  /* DS 24 → 20 */
  .app-denom-cell__unit { @apply text-xs; }

  .app-denom-cell--bill.app-denom-cell--top { @apply bg-accent text-on-accent; }
  .app-denom-cell--bill.app-denom-cell--has { @apply bg-peach text-ink; }
  .app-denom-cell--bill.app-denom-cell--has .app-denom-cell__value,
  .app-denom-cell--bill.app-denom-cell--has .app-denom-cell__unit { @apply text-peach-sub; }
  .app-denom-cell--bill.app-denom-cell--zero { @apply border-dashed border-line bg-zero-bg text-faint; }
  .app-denom-cell--bill.app-denom-cell--zero .app-denom-cell__value,
  .app-denom-cell--bill.app-denom-cell--zero .app-denom-cell__unit { @apply text-placeholder; }

  /* Coins: circle, solid line border; zero = dashed on coin-zero */
  .app-denom-cell--coin { @apply aspect-square rounded-full border-line bg-surface; }
  .app-denom-cell--coin .app-denom-cell__value { @apply text-micro text-muted whitespace-nowrap; }
  .app-denom-cell--coin .app-denom-cell__count { @apply text-xl text-ink; }                 /* 20 */
  .app-denom-cell--coin.app-denom-cell--compact .app-denom-cell__count { @apply text-btn; } /* DS 17 → 16 */
  .app-denom-cell--coin.app-denom-cell--zero { @apply border-dashed bg-coin-zero; }
  .app-denom-cell--coin.app-denom-cell--zero .app-denom-cell__value { @apply text-placeholder; }
  .app-denom-cell--coin.app-denom-cell--zero .app-denom-cell__count { @apply text-faint; }
}
</style>
