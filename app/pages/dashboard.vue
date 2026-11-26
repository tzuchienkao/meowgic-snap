<template>
  <div class="page-settings flex flex-col gap-5">
    <div class="page-settings__header">
      <h1 class="text-ink text-h1">儀表板</h1>
      <p class="text-muted text-helper mt-1">喵奴才，這是你到目前為止的兌換紀錄喵</p>
    </div>
    <!-- DS: one column under 900px, two columns from 900px (desktop: breakpoint) -->
    <div class="page-dashboard__body grid grid-cols-1 items-start gap-5 desktop:grid-cols-2">
      <div class="page-dashboard__column">
        <!-- 累計兌換總金額 -->
        <app-total-card size="lg" label="累計兌換總金額" :amount="formatNumber(totalAmount)">
          <span class="total-card__since">自 {{ formatDate(startedAt) }} 開始累計</span>
        </app-total-card>

        <!-- 每月金額趨勢 -->
        <app-card title="每月金額趨勢">
          <template #aside>近 {{ monthlyBars.length }} 個月</template>
          <div class="trend-chart">
            <div class="trend-chart__bars">
              <div v-for="bar in monthlyBars" :key="bar.month" class="trend-chart__col">
                <span class="trend-chart__value" :class="{ 'trend-chart__value--max': bar.isMax }">{{ bar.valueLabel }}</span>
                <div
                  class="trend-chart__bar"
                  :class="{ 'trend-chart__bar--max': bar.isMax }"
                  :style="{ height: `${bar.height}px` }"
                />
              </div>
            </div>
            <div class="trend-chart__labels">
              <span v-for="bar in monthlyBars" :key="bar.month" class="trend-chart__label">{{ bar.monthLabel }}</span>
            </div>
          </div>
        </app-card>

        <!-- 各面額累計 -->
        <app-card title="各面額累計">
          <h3 class="denoms__title">紙鈔（{{ CurrencyUnit.Bill }}）</h3>
          <div class="denoms__bills">
            <app-denom-cell
              v-for="cell in billCells"
              :key="cell.denomination"
              compact
              :value="cell.denomination"
              :count="cell.count"
              :state="cell.isTop ? DenomCellState.Top : undefined"
            />
          </div>
          <h3 class="denoms__title denoms__title--coins">硬幣（{{ CurrencyUnit.Coin }}）</h3>
          <div class="denoms__coins">
            <app-denom-cell
              v-for="cell in coinCells"
              :key="cell.denomination"
              class="denoms__coin bg-soft"
              compact
              :kind="DenomKind.Coin"
              :value="cell.denomination"
              :count="cell.count"
            />
          </div>
        </app-card>
      </div>

      <!-- 最近幾次兌換: desktop mt-4 lines its top up with the TotalCard body below the cat ears -->
      <app-card title="最近幾次兌換" class="recent-card">
        <template #aside>
          <app-button variant="secondary" size="xs" @click="onAllRecordsClick">全部紀錄 ›</app-button>
        </template>
        <ul class="recent-card__list">
          <li v-for="record in recentRows" :key="record.id">
            <app-record-row
              :name="record.name"
              :date="record.date"
              :meta="record.meta"
              :amount="record.amount"
              chevron
              @click="onRecordClick"
            />
          </li>
        </ul>
      </app-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CurrencyUnit } from '~/constants/currency';
import { RouteName } from '~/constants/navigation';
import { useDashboard } from '~/composables/useDashboard';
import { DenomCellState, DenomKind } from '~/types/denomination';
import { isBill } from '~/utils/moneyParser';

/** Chart: tallest bar height and the minimum so a 0 month still shows a stub (px) */
const BAR_MAX_HEIGHT = 150;
const BAR_MIN_HEIGHT = 8;
const EMPTY_VALUE_LABEL = '—';

const router = useRouter();
const { totalAmount, startedAt, monthlyTotals, denominationTotals, recentRecords } = useDashboard();

const formatNumber = (value: number) => value.toLocaleString('en-US');
const pad2 = (value: number) => String(value).padStart(2, '0');
/** ISO → "2026/10/17" (local time) */
const formatDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
};

// 每月金額趨勢: highest month in accent, labels like "107k" ("—" for an empty month)
const monthlyBars = computed(() => {
  const max = Math.max(0, ...monthlyTotals.value.map((item) => item.total));
  return monthlyTotals.value.map(({ month, total }) => ({
    month,
    monthLabel: `${Number(month.split('-')[1])}月`,
    valueLabel: total ? `${formatNumber(Math.round(total / 1000))}k` : EMPTY_VALUE_LABEL,
    isMax: total > 0 && total === max,
    height: max ? Math.max(BAR_MIN_HEIGHT, Math.round((total / max) * BAR_MAX_HEIGHT)) : BAR_MIN_HEIGHT
  }));
});

// 各面額累計: large → small, split into bills and coins; the most-used bill is highlighted
const sortedDenominations = computed(() => [...denominationTotals.value].sort((a, b) => b.denomination - a.denomination));
const billCells = computed(() => {
  const bills = sortedDenominations.value.filter((item) => isBill(item.denomination));
  const topCount = Math.max(0, ...bills.map((item) => item.count));
  return bills.map((item) => ({ ...item, isTop: topCount > 0 && item.count === topCount }));
});
const coinCells = computed(() => sortedDenominations.value.filter((item) => !isBill(item.denomination)));

// 最近幾次兌換
const recentRows = computed(() =>
  recentRecords.value.map((record) => ({
    id: record.id,
    name: record.name,
    date: formatDate(record.createdAt),
    meta: `${record.entryCount} 筆`,
    amount: formatNumber(record.totalAmount)
  }))
);

const onAllRecordsClick = () => {
  router.push({ name: RouteName.Logs });
};

// TODO: open the clicked record once the 紀錄 page supports it
const onRecordClick = () => {
  router.push({ name: RouteName.Logs });
};
</script>

<style scoped>
@reference "~/assets/css/main.css";

.page-dashboard__column {
  @apply flex flex-col gap-5;
}

.total-card__since {
  @apply text-helper text-hero-chip-text;
}

/* DS chart: 200px tall, columns 10px apart → 12px, value-to-bar 6px → 8px */
.trend-chart {
  @apply flex flex-col gap-2;
}
.trend-chart__bars {
  @apply grid h-50 grid-cols-6 items-end gap-3;
}
.trend-chart__col {
  @apply flex h-full flex-col items-center justify-end gap-2;
}
.trend-chart__value {
  @apply text-xs whitespace-nowrap text-muted;
}
.trend-chart__value--max {
  @apply text-accent-text;
}
.trend-chart__bar {
  @apply w-full max-w-14 rounded-t-md rounded-b-sm bg-peach;
}
.trend-chart__bar--max {
  @apply bg-accent;
}
.trend-chart__labels {
  @apply grid grid-cols-6 gap-3;
}
.trend-chart__label {
  @apply text-center text-helper text-muted;
}

.denoms__title {
  @apply text-sm text-muted;
}
.denoms__title--coins {
  @apply pt-1;
}
.denoms__bills {
  @apply grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2;
}
.denoms__coins {
  @apply grid grid-cols-5 gap-2;
}
.denoms__coin {
  @apply w-full max-w-21 justify-self-center;
}

/* DS card gap 10 → 12; rows 8px apart (RecordRow spec) */
.recent-card {
  @apply gap-3 desktop:mt-4;
}
.recent-card__list {
  @apply flex flex-col gap-2;
}
</style>
