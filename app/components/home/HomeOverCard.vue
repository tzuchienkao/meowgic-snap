<template>
  <app-cat-ear-card class="over-card">
    <div class="over-card__content">
      <app-illustration-slot class="over-card__art">
        <img src="~/assets/images/cats-under-money.svg" alt="貓咪插畫：被一疊鈔票壓住" />
      </app-illustration-slot>
      <div class="over-card__text">
        <h2 class="over-card__title">太多了喵，算不動 (=ΦдΦ=)</h2>
        <p class="over-card__desc">
          你貼了 <b class="text-ink">{{ formatNumber(entryCount) }}</b> 筆，每次最多只支援
          {{ formatNumber(MAX_ENTRIES) }} 筆，多出 <b class="text-warn-text">{{ formatNumber(extraCount) }}</b> 筆。
        </p>
      </div>
      <div class="over-card__split">
        <div class="over-card__split-item">
          <span class="over-card__split-label">這次先算</span>
          <span class="over-card__split-value">{{ formatNumber(MAX_ENTRIES) }} 筆</span>
        </div>
        <span class="over-card__split-plus" aria-hidden="true">＋</span>
        <div class="over-card__split-item">
          <span class="over-card__split-label">下一批</span>
          <span class="over-card__split-value text-warn-text">{{ formatNumber(extraCount) }} 筆</span>
        </div>
      </div>
      <app-button variant="primary" full :label="calcFirstLabel" @click="emit('calcFirst')" />
      <app-button variant="secondary" full :label="copyRestLabel" @click="emit('copyRest')" />
    </div>
  </app-cat-ear-card>
</template>

<script setup lang="ts">
/** 首頁: more than MAX_ENTRIES pasted — calculate the first MAX_ENTRIES now, or copy the rest */
import { computed } from 'vue';
import { formatNumber } from '~/utils/format';
import { MAX_ENTRIES } from '~/utils/moneyParser';

const { entryCount, isLogin = false, isRestCopied = false } = defineProps<{
  entryCount: number;
  /** Members also save what they calculate */
  isLogin?: boolean;
  /** The rest was just copied: the copy button says so for a moment */
  isRestCopied?: boolean;
}>();

const emit = defineEmits<{ calcFirst: []; copyRest: [] }>();

const extraCount = computed(() => Math.max(0, entryCount - MAX_ENTRIES));
const calcFirstLabel = computed(() =>
  isLogin ? `只算前 ${formatNumber(MAX_ENTRIES)} 筆並存檔` : `只算前 ${formatNumber(MAX_ENTRIES)} 筆`,
);
const copyRestLabel = computed(() =>
  isRestCopied ? '已複製 ✓' : `複製第 ${formatNumber(MAX_ENTRIES + 1)} 筆之後的 ${formatNumber(extraCount.value)} 筆`,
);
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .over-card__content { @apply flex flex-col gap-4; }
  .over-card__art { @apply min-h-30; }
  .over-card__text { @apply flex flex-col gap-2 text-center; }
  .over-card__title { @apply text-h2 text-ink; }
  .over-card__desc { @apply text-body-sm text-ink-2; }
  /* DS: soft row, radius 20, padding 14px 16px → 12px 16px */
  .over-card__split { @apply grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-soft px-4 py-3; }
  .over-card__split-item { @apply flex flex-col items-center; }
  .over-card__split-label { @apply text-xs text-muted; }
  /* DS 24px */
  .over-card__split-value { @apply text-2xl text-ink; }
  .over-card__split-plus { @apply text-lg text-faint; }
}
</style>
