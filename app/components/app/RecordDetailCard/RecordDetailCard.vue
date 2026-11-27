<template>
  <div class="app-record-detail-card" :class="{ 'app-record-detail-card--open': open }">
    <span class="app-record-detail-card__ear app-record-detail-card__ear--left" aria-hidden="true" />
    <span class="app-record-detail-card__ear app-record-detail-card__ear--right" aria-hidden="true" />
    <div class="app-record-detail-card__body">
      <button type="button" class="app-record-detail-card__head" :aria-expanded="open" @click="emit('toggle')">
        <span class="app-record-detail-card__text">
          <span class="app-record-detail-card__name">{{ name }}</span>
          <span class="app-record-detail-card__meta">{{ date }} · {{ count }} 筆</span>
        </span>
        <span v-if="!open" class="app-record-detail-card__head-amount">{{ amount }}</span>
        <span class="app-record-detail-card__chevron" aria-hidden="true">▼</span>
      </button>

      <!-- Stays rendered so it can slide open / closed; folded it is inert (no focus, hidden from screen readers) -->
      <div class="app-record-detail-card__panel" :inert="!open" :aria-hidden="open ? undefined : 'true'">
        <div class="app-record-detail-card__panel-inner">
          <div class="app-record-detail-card__total">
            <div class="app-record-detail-card__total-head">
              <span class="app-record-detail-card__format">{{ format }} · 合計</span>
              <button type="button" class="app-record-detail-card__rename" @click="emit('rename')">✎ 改名</button>
            </div>
            <div class="app-record-detail-card__amount">
              {{ amount }}<span class="app-record-detail-card__unit"> {{ CurrencyUnit.Dollar }}</span>
            </div>
          </div>

          <div class="app-record-detail-card__cash">
            <div class="app-record-detail-card__cash-head">
              <span class="app-record-detail-card__cash-title">這次要準備的現金</span>
              <app-button size="sm" icon="↓" label="匯出這筆 CSV" @click="emit('export')" />
            </div>
            <div class="app-record-detail-card__badges">
              <app-denom-badge
                v-for="item in breakdown"
                :key="item.denomination"
                size="md"
                :on-surface="false"
                :value="item.denomination"
                :count="item.count"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Design system: RecordDetailCard — mobile 紀錄: the selected record and its detail merged into one
 * cat-ear card, in place of the selected RecordRow. The row is the card's head (strong fill); the total
 * and the cash breakdown sit inside the same dark ground. Collapsed = the head only, ears kept as the
 * selection mark. Other rows stay plain RecordRows; give this card 8px extra space above and below.
 * Extra (not in DS): the detail slides open / closed (also when the card first appears), and the chevron
 * turns; no motion with prefers-reduced-motion.
 */
import { CurrencyUnit } from '~/constants/currency';

const {
  name,
  date,
  count,
  format = '姓名＋金額',
  amount,
  breakdown = [],
  open = true
} = defineProps<{
  name: string;
  /** Pre-formatted, e.g. "2026/11/20" */
  date: string;
  /** Number of entries (筆) */
  count: number;
  /** e.g. "姓名＋金額" | "純金額" */
  format?: string;
  /** Pre-formatted, e.g. "96,300": in the head when collapsed, in the total area when open */
  amount: string;
  /** Only counts > 0, large → small */
  breakdown?: { denomination: number; count: number }[];
  open?: boolean;
}>();

/** toggle: tap on the head (the list keeps only one card open) */
const emit = defineEmits<{ toggle: []; rename: []; export: [] }>();
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* mt-3: the ears stick out 12px above the card */
  .app-record-detail-card { @apply relative mt-3; }

  /* Ears in the strong colour, so they join the head (dark ink in light theme, cat-eye yellow in dark) */
  .app-record-detail-card__ear { @apply absolute -top-3 size-7 rotate-45 rounded-[7px] bg-strong; }
  .app-record-detail-card__ear--left { @apply left-7; }
  .app-record-detail-card__ear--right { @apply right-7; }

  .app-record-detail-card__body { @apply relative flex flex-col overflow-hidden rounded-card bg-hero; }

  /* DS min-height 68 / padding 12 20 → 12px padding + 24 + 4 + 16 lines = 68 */
  .app-record-detail-card__head {
    @apply flex w-full items-center gap-3 bg-strong px-5 py-3 text-left text-strong-text cursor-pointer;
  }
  .app-record-detail-card__text { @apply flex min-w-0 flex-1 flex-col gap-1; }
  .app-record-detail-card__name { @apply truncate text-body-md leading-6 font-medium; }
  .app-record-detail-card__meta { @apply text-xs; }
  .app-record-detail-card__head-amount { @apply text-xl whitespace-nowrap; }
  .app-record-detail-card__chevron { @apply text-xs; transition: rotate 0.3s ease; }
  .app-record-detail-card--open .app-record-detail-card__chevron { rotate: 180deg; }
  /* The amount moves from the total area into the head when folded */
  .app-record-detail-card__head-amount { transition: opacity 0.3s ease; }

  /* Slide: the grid row grows from 0fr to 1fr (the content's own height), fading in with it.
     @starting-style also slides it open when the card first appears (another row was tapped). */
  .app-record-detail-card__panel {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transition: grid-template-rows 0.3s ease, opacity 0.3s ease;
  }
  .app-record-detail-card--open .app-record-detail-card__panel {
    grid-template-rows: 1fr;
    opacity: 1;
  }
  @starting-style {
    .app-record-detail-card__head-amount { opacity: 0; }
    .app-record-detail-card--open .app-record-detail-card__panel {
      grid-template-rows: 0fr;
      opacity: 0;
    }
  }
  .app-record-detail-card__panel-inner { @apply min-h-0 overflow-hidden; }

  @media (prefers-reduced-motion: reduce) {
    .app-record-detail-card__chevron,
    .app-record-detail-card__head-amount,
    .app-record-detail-card__panel { transition: none; }
  }

  .app-record-detail-card__total { @apply flex flex-col gap-2 px-5 pt-4 pb-5; }
  .app-record-detail-card__total-head { @apply flex items-center justify-between gap-2; }
  .app-record-detail-card__format { @apply text-helper text-hero-chip-text; }
  /* DS 32px tall: 8px padding + 16px line */
  .app-record-detail-card__rename {
    @apply rounded-full bg-hero-chip px-3 py-2 text-xs whitespace-nowrap text-hero-chip-text cursor-pointer;
  }
  .app-record-detail-card__amount { @apply text-display leading-tight text-hero-num; }
  .app-record-detail-card__unit { @apply text-base text-hero-text; }

  /* Inset panel: 4px from the card's sides and bottom */
  .app-record-detail-card__cash { @apply mx-1 mb-1 flex flex-col gap-4 rounded-3xl bg-rdc-inner p-5; }
  .app-record-detail-card__cash-head { @apply flex flex-wrap items-center justify-between gap-2; }
  .app-record-detail-card__cash-title { @apply text-lg text-ink; }
  .app-record-detail-card__badges { @apply flex flex-wrap gap-2; }
  .app-record-detail-card .app-denom-badge { @apply bg-rdc-badge; }
}
</style>
