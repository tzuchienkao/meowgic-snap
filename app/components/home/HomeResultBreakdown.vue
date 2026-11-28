<template>
  <!-- Denomination totals across everyone; a group with nothing enabled is left out -->
  <section class="result-area__denoms" aria-label="面額統計">
    <template v-if="billCells.length">
      <h3 class="result-area__section-title">紙鈔</h3>
      <div class="result-area__bills">
        <app-denom-cell
          v-for="cell in billCells"
          :key="cell.value"
          :value="cell.value"
          :count="cell.count"
          :state="cell.isTop ? DenomCellState.Top : undefined"
        />
      </div>
    </template>
    <template v-if="coinCells.length">
      <h3 class="result-area__section-title">硬幣</h3>
      <div class="result-area__coins">
        <app-denom-cell
          v-for="cell in coinCells"
          :key="cell.value"
          :kind="DenomKind.Coin"
          :value="cell.value"
          :count="cell.count"
        />
      </div>
      <p class="result-area__unit">單位：{{ CurrencyUnit.Coin }}</p>
    </template>
  </section>

  <!-- Per-person details (collapsible) -->
  <div class="result-area__details">
    <button
      type="button"
      class="result-area__details-toggle"
      :aria-expanded="isDetailsOpen"
      aria-controls="result-details-list"
      @click="isDetailsOpen = !isDetailsOpen"
    >
      <span>每筆明細</span>
      <span class="result-area__details-hint">{{ isDetailsOpen ? '收起 ▲' : '展開 ▼' }}</span>
    </button>
    <ul v-show="isDetailsOpen" id="result-details-list" class="summary-card__rows">
      <li v-for="row in rows" :key="row.name" class="summary-card__row">
        <div class="summary-card__row-head">
          <span>{{ row.name }}</span>
          <span>{{ formatNumber(row.total) }} {{ CurrencyUnit.Dollar }}</span>
        </div>
        <div class="summary-card__row-body">
          <app-denom-badge
            v-for="item in row.items"
            :key="`${row.name}-${item.denomination}`"
            :value="item.denomination"
            :count="item.count"
          />
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/** 首頁 result: 面額統計 (bills, then coins) and the collapsible 每筆明細 */
import { CurrencyUnit } from '~/constants/currency';
import { DenomCellState, DenomKind, type IDenominationCell, type IResultRow } from '~/types/denomination';
import { formatNumber } from '~/utils/format';

const { billCells, coinCells, rows } = defineProps<{
  billCells: IDenominationCell[];
  coinCells: IDenominationCell[];
  rows: IResultRow[];
}>();

/** 每筆明細 open; the page opens it again after each calculation */
const isDetailsOpen = defineModel<boolean>('detailsOpen', { default: true });
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .result-area__denoms { @apply flex flex-col gap-3; }
  .result-area__section-title { @apply px-2 pt-1 text-btn text-ink; }
  .result-area__bills { @apply grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3; }
  .result-area__coins { @apply grid grid-cols-5 gap-2 max-w-110; }
  .result-area__unit { @apply px-2 text-xs text-muted; }
  .result-area__details { @apply overflow-hidden rounded-3xl bg-surface; }
  /* DS height 54 → 16px text (24px line) + 16px ×2 = 56 */
  .result-area__details-toggle { @apply flex w-full items-center justify-between px-5 py-4 text-btn leading-6 text-ink cursor-pointer; }
  .result-area__details-hint { @apply text-body-sm text-muted; }
  .summary-card__rows { @apply flex flex-col gap-2 px-3 pb-3; }
  /* DS row: soft bg, radius 16, padding 10px 14px → 12px 16px */
  .summary-card__row { @apply flex flex-col gap-1 rounded-row bg-soft px-4 py-3; }
  .summary-card__row-head { @apply flex items-baseline justify-between; }
  .summary-card__row-head span:first-child { @apply text-body-sm font-medium; }
  .summary-card__row-head span:last-child { @apply text-btn; }
  .summary-card__row-body { @apply flex flex-wrap gap-2 pt-1; }
}
</style>
