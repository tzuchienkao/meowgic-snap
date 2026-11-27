<template>
  <div class="record-detail">
    <app-cat-ear-card tone="hero" class="record-detail__hero">
      <div class="record-detail__name-chip">
        <span class="record-detail__name">{{ record.name }}</span>
        <button type="button" class="record-detail__rename" @click="emit('rename')">✎ 改名</button>
      </div>
      <div class="record-detail__summary">
        <span class="record-detail__meta">
          {{ formatDate(record.createdAt) }} · {{ record.entryCount }} 筆 · {{ INPUT_FORMAT_LABEL[record.inputFormat] }}
        </span>
        <span class="record-detail__amount">
          {{ formatNumber(record.totalAmount) }}<span class="record-detail__unit"> {{ CurrencyUnit.Dollar }}</span>
        </span>
      </div>
    </app-cat-ear-card>

    <app-card title="這次要準備的現金" radius="sub" class="record-detail__cash">
      <template #aside>
        <app-button size="sm" icon="↓" label="匯出這筆 CSV" @click="emit('export')" />
      </template>
      <div class="record-detail__badges">
        <app-denom-badge
          v-for="item in cash"
          :key="item.denomination"
          size="md"
          :on-surface="false"
          :value="item.denomination"
          :count="item.count"
        />
      </div>
    </app-card>
  </div>
</template>

<script setup lang="ts">
import { formatDate, formatNumber } from '~/utils/format';
/**
 * 紀錄頁 detail of one record on desktop (right column): the dark name / total card and 這次要準備的現金.
 * Mobile shows AppRecordDetailCard in the list instead.
 */
import { computed } from 'vue';
import { CurrencyUnit } from '~/constants/currency';
import { INPUT_FORMAT_LABEL } from '~/constants/record';
import type { IRecordDetail } from '~/types/record';

const { record } = defineProps<{ record: IRecordDetail }>();

const emit = defineEmits<{ rename: []; export: [] }>();

/** 這次要準備的現金: non-zero counts, large → small */
const cash = computed(() =>
  Object.entries(record.denominationCounts)
    .map(([denomination, count]) => ({ denomination: Number(denomination), count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.denomination - a.denomination),
);
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* DS gap 14 → 16 */
  .record-detail { @apply flex flex-col gap-4; }
  .record-detail__hero { @apply gap-3; }
  /* DS chip 46px tall: 12px padding + 24px line ≈ 48 */
  .record-detail__name-chip { @apply flex items-center gap-3 rounded-full bg-hero-chip px-4 py-3; }
  .record-detail__name { @apply flex-1 truncate text-lg leading-6 text-hero-text; }
  .record-detail__rename { @apply text-helper whitespace-nowrap text-hero-chip-text cursor-pointer; }
  .record-detail__summary { @apply flex flex-wrap items-baseline justify-between gap-3; }
  .record-detail__meta { @apply text-helper text-hero-chip-text; }
  /* DS 34px → total (36) */
  .record-detail__amount { @apply text-total leading-tight text-hero-num; }
  .record-detail__unit { @apply text-btn text-hero-text; }
  .record-detail__cash { @apply gap-3; }
  .record-detail__badges { @apply flex flex-wrap gap-2; }
}
</style>
