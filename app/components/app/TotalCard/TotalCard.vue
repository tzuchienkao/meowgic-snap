<template>
  <app-cat-ear-card tone="hero" class="app-total-card" :class="`app-total-card--${size}`">
    <div class="app-total-card__content">
      <div class="app-total-card__head">
        <span class="app-total-card__label">{{ label }}</span>
        <span class="app-total-card__amount">
          <span class="app-total-card__amount-value">{{ amount }}</span>
          <span class="app-total-card__unit"> {{ unit }}</span>
        </span>
      </div>
      <div v-if="chips.length" class="app-total-card__chips">
        <app-chip v-for="(chip, index) in chips" :key="index" tone="hero" class="text-helper">{{ chip }}</app-chip>
      </div>
      <slot />
    </div>
  </app-cat-ear-card>
</template>

<script setup lang="ts">
/**
 * Design system: TotalCard — dark cat-ear 總額卡: label, large amount in the hero-num colour,
 * and meta chips. The heaviest element on a screen (only one per screen with the orange CTA).
 * size: md 36px inline (home) · lg 44px stacked (dashboard 累計).
 */
import { CurrencyUnit } from '~/constants/currency';

const {
  label = '總金額',
  amount,
  unit = CurrencyUnit.Dollar,
  chips = [],
  size = 'md'
} = defineProps<{
  label?: string;
  /** Pre-formatted with thousands separators, e.g. "96,300" */
  amount: string;
  unit?: string;
  /** e.g. ["總筆數：3 筆", "計算時間 14:32:05"] */
  chips?: string[];
  size?: 'md' | 'lg';
}>();
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* DS gap md 10 → 12, lg 6 → 8 */
  .app-total-card__content { @apply flex flex-col gap-3; }
  .app-total-card--lg .app-total-card__content { @apply gap-2; }

  .app-total-card__head { @apply flex flex-wrap items-baseline justify-between gap-3; }
  .app-total-card--lg .app-total-card__head { @apply flex-col items-start justify-start gap-2; }

  .app-total-card__label { @apply text-btn text-hero-text; }
  .app-total-card__amount-value { @apply text-total leading-tight text-hero-num; }
  .app-total-card--lg .app-total-card__amount-value { @apply text-display; }
  .app-total-card__unit { @apply text-btn text-hero-text; }
  .app-total-card--lg .app-total-card__unit { @apply text-lg; }

  .app-total-card__chips { @apply flex flex-wrap gap-2; }
}
</style>
