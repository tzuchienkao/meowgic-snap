<template>
  <div class="page-index">
    <div class="page-index__header" />
    <!-- DS: one column under 900px, two columns from 900px (desktop: breakpoint) -->
    <div class="page-index__body grid grid-cols-1 gap-6 desktop:grid-cols-2">
      <!-- Input Card -->
      <app-cat-ear-card>
        <div class="flex flex-col gap-4">
          <!-- Header -->
          <div class="flex flex-col gap-1 text-center">
            <p class="text-ink text-lg">現在支援<span class="text-accent-dark">姓名,金額</span>資料</p>
            <p class="text-muted text-base">按照下面提示的格式交出你的資料</p>
          </div>

          <!-- Current Settings (Logged In Only) -->
          <div v-if="isLogin" class="current-settings">
            <app-button
              variant="secondary"
              size="sm"
              class="text-xs rounded-full text-muted bg-bg"
              :label="`目前設定：姓名,金額 · ${denominations} 種面額`"
            >
              <template #append>
                <span>到設定修改 ›</span>
              </template>
            </app-button>
          </div>

          <!-- Instructions -->
          <div class="instruction">
            <div class="instruction--notice">
              <p class="text-ink font-bold">注意（不要說我沒說）：</p>
              <ul>
                <li class="my-1">
                  <p>每一行只能有一筆姓名,金額（手動輸入用逗號；從試算表複製貼上會自動辨識）。例如：張三,18500。</p>
                </li>
                <li class="my-1">
                  <p>每次最多可貼入 1000 筆。</p>
                </li>
                <li class="my-1">
                  <p>每筆金額之整數部分上限為 999,999。</p>
                </li>
                <li class="my-1">
                  <p>姓名可重複多筆，系統會自動加總（每人合計上限同為 999,999）。</p>
                </li>
                <li class="my-1">
                  <p>姓名最多 20 字；金額只能是正整數，前後只能加幣別或單位（如 NT$、元）。</p>
                </li>
              </ul>
            </div>
            <div class="instruction--tips">
              <p class="text-ink font-bold">從 CSV 貼上小提示：</p>
              <ul>
                <li class="my-1">
                  <p>CSV 檔案中若金額包含千分位逗號，請用雙引號包住（如："45,800"），避免被誤判為欄位分隔符。</p>
                </li>
                <li class="my-1">
                  <p>支援 Excel 直接複製貼上或另存 CSV 上傳（系統將自動過濾引號、貨幣符號與千分位逗號）。</p>
                </li>
              </ul>
            </div>
          </div>

          <!-- Input Textarea -->
          <div class="money-snap">
            <app-textarea
              v-model="moneySnapInput"
              class="money-snap__textarea"
              aria-label="貼上金額資料，每行一筆"
              :placeholder="placeholderText"
              :disabled="isProcessing"
              :readonly="resultState.isCalculated"
            />
            <div class="money-snap__notices">
              <app-button
                variant="secondary"
                size="sm"
                icon="↑"
                label="匯入 CSV"
                :disabled="isProcessing"
              />
              <app-chip class="money-snap__counter" :tone="entryCount > 1000 ? 'warn' : 'soft'">
                已貼 {{ entryCount }} / 1,000 筆
              </app-chip>
            </div>
            <app-alert
              v-if="validationErrors.length"
              class="money-snap__error-box"
              :title="lineErrors.length ? '喵？有幾行看不懂 (ΦдΦ)' : ''"
            >
              <ul class="money-snap__errors">
                <li v-for="error in visibleErrors" :key="error">{{ error }}</li>
                <li v-if="hiddenErrorCount" class="money-snap__errors-more">還有 {{ hiddenErrorCount }} 行也看不懂</li>
              </ul>
            </app-alert>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <!-- Logged In: Calculate & Save OR Clear -->
            <template v-if="isLogin">
              <app-button
                v-if="!resultState.isCalculated"
                variant="primary"
                full
                label="計算並存檔 ฅ^•ﻌ•^ฅ"
                :disabled="!canCalculate || isProcessing"
                @click="onCalculateClick"
              />
              <app-button
                v-else
                variant="secondary"
                full
                label="清除資料，算下一筆"
                :disabled="isProcessing"
                @click="onClearClick"
              />
            </template>

            <!-- Not Logged In: Calculate OR Login -->
            <template v-else>
              <template v-if="!resultState.isCalculated">
                <app-button
                  variant="primary"
                  full
                  label="直接計算"
                  :disabled="!canCalculate || isProcessing"
                  @click="onCalculateClick"
                />
                <app-button
                  variant="strong"
                  full
                  label="登入存檔 ฅ^•ﻌ•^ฅ"
                  :disabled="isProcessing"
                  @click="onLoginSaveClick"
                />
              </template>
              <app-button
                v-else
                variant="secondary"
                full
                label="清除資料，算下一筆"
                :disabled="isProcessing"
                @click="onClearClick"
              />
            </template>
          </div>
        </div>
      </app-cat-ear-card>

      <!-- Result: illustration placeholder until calculated, then the dark total card
           (DS: only one heaviest element per screen) -->
      <div>
        <app-illustration-slot
          v-if="!resultState.isCalculated"
          class="result-placeholder"
          label="貓咪插畫：橘白貓趴著等"
          radius="card"
          :stripe="10"
        >
          <p class="result-placeholder__text">算好的結果會出現在這裡喵</p>
        </app-illustration-slot>

        <div v-else class="result-area">
          <app-total-card
            class="summary-card"
            :amount="formatAmount(resultState.totalAmount)"
            :chips="summaryChips"
          />

          <!-- TODO: export ActionTiles (⧉ 複製領款單 · ▣ 下載明細圖 · ↓ 匯出 CSV) go here, in a
               3-column grid, once those features are built (hidden until then). -->

          <!-- Denomination totals across everyone -->
          <section class="result-area__denoms" aria-labelledby="result-bills-title">
            <h3 id="result-bills-title" class="result-area__section-title">紙鈔</h3>
            <div class="result-area__bills">
              <app-denom-cell
                v-for="cell in billCells"
                :key="cell.value"
                :value="cell.value"
                :count="cell.count"
                :state="cell.isTop ? 'top' : undefined"
              />
            </div>
            <h3 class="result-area__section-title">硬幣</h3>
            <div class="result-area__coins">
              <app-denom-cell
                v-for="cell in coinCells"
                :key="cell.value"
                kind="coin"
                :value="cell.value"
                :count="cell.count"
              />
            </div>
            <p class="result-area__unit">單位：個</p>
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
              <li v-for="row in resultState.rows" :key="row.name" class="summary-card__row">
                <div class="summary-card__row-head">
                  <span>{{ row.name }}</span>
                  <span>{{ formatAmount(row.total) }} 元</span>
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  calculateDenominations,
  countEntryLines,
  DEFAULT_DENOMINATIONS,
  isBill,
  parseMoneySnap,
  type ParsedEntry,
} from '~/utils/moneyParser';

// Composables
const { user } = useAuth();

interface IDenominationItem {
  denomination: number;
  count: number;
}

interface IResultRow {
  name: string;
  total: number;
  /** Non-zero denominations only, smallest → largest */
  items: IDenominationItem[];
}

const MAX_VISIBLE_ERRORS = 5;

// State
const isLogin = computed(() => !!user.value);
// No 偏好設定 yet: everyone uses the common denominations
const activeDenominations = DEFAULT_DENOMINATIONS;
const denominations = computed(() => activeDenominations.length);
const isProcessing = ref(false);
const moneySnapInput = ref('');
const validationErrors = ref<string[]>([]);
const isDetailsOpen = ref(true);

// Result state - explicit "not calculated" vs "calculated" behavior
const resultState = ref({
  isCalculated: false,
  totalAmount: 0,
  entryCount: 0,
  uniqueNames: 0,
  calculatedAt: '',
  rows: [] as IResultRow[],
});

// Computed properties
// Counts non-blank lines (header row excluded); may exceed 1,000 for display — the parser enforces the limit.
const entryCount = computed(() => countEntryLines(moneySnapInput.value));

// Line errors start with 「第 N 行」; anything else (e.g. the entry-limit message) is shown as-is.
const isLineError = (error: string) => error.startsWith('第 ');
const lineErrors = computed(() => validationErrors.value.filter(isLineError));
const otherErrors = computed(() => validationErrors.value.filter((e) => !isLineError(e)));
const visibleErrors = computed(() => [
  ...lineErrors.value.slice(0, MAX_VISIBLE_ERRORS),
  ...otherErrors.value,
]);
const hiddenErrorCount = computed(() => Math.max(0, lineErrors.value.length - MAX_VISIBLE_ERRORS));

const canCalculate = computed(() => {
  return moneySnapInput.value.trim().length > 0;
});

const placeholderText = computed(() => {
  return '張三,18500\n李四,"45,800"\n王五,NT$32,000\n張三,1999';
});


const summaryChips = computed(() => {
  const { entryCount, uniqueNames, calculatedAt } = resultState.value;
  const chips = [`總筆數：${entryCount} 筆 · ${uniqueNames} 人`, '姓名,金額'];
  if (calculatedAt) chips.push(`計算時間 ${calculatedAt}`);
  return chips;
});

// Totals per denomination across everyone (bills large → small, then coins)
const denominationTotals = computed(() => {
  const totals: Record<number, number> = {};
  resultState.value.rows.forEach((row) => {
    row.items.forEach(({ denomination, count }) => {
      totals[denomination] = (totals[denomination] ?? 0) + count;
    });
  });
  return totals;
});

// DS: the most-used bill is highlighted (ties → the larger bill); no highlight when no bills are used
const billCells = computed(() => {
  const cells = activeDenominations.filter(isBill).map((value) => ({
    value,
    count: denominationTotals.value[value] ?? 0,
    isTop: false,
  }));
  const top = cells.reduce((best, cell) => (cell.count > best.count ? cell : best), cells[0]!);
  if (top.count > 0) top.isTop = true;
  return cells;
});

const coinCells = computed(() =>
  activeDenominations.filter((value) => !isBill(value)).map((value) => ({
    value,
    count: denominationTotals.value[value] ?? 0,
  })),
);

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-US').format(amount);
};

// Smallest → largest, zero counts dropped
const toDenominationItems = (denominations: Record<number, number>): IDenominationItem[] =>
  [...activeDenominations]
    .sort((a, b) => a - b)
    .map((denomination) => ({ denomination, count: denominations[denomination] ?? 0 }))
    .filter((item) => item.count > 0);

const formatTime = () => {
  return new Date().toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const aggregateEntries = (entries: ParsedEntry[]) => {
  const resultMap = new Map<string, number>();

  entries.forEach((entry) => {
    const currentValue = resultMap.get(entry.name) ?? 0;
    resultMap.set(entry.name, currentValue + entry.amount);
  });

  return Array.from(resultMap.entries()).map(([name, total]) => ({
    name,
    total,
    items: toDenominationItems(calculateDenominations(total, activeDenominations).denominations),
  }));
};

const onCalculateClick = async () => {
  isProcessing.value = true;
  validationErrors.value = [];

  try {
    const parsedResult = parseMoneySnap(moneySnapInput.value);

    if (!parsedResult.success) {
      validationErrors.value = parsedResult.errors.length
        ? parsedResult.errors
        : ['請輸入正確的資料格式'];
      resultState.value = {
        ...resultState.value,
        isCalculated: false,
        rows: [],
      };
      return;
    }

    if (parsedResult.errors.length) {
      validationErrors.value = parsedResult.errors;
      resultState.value = {
        ...resultState.value,
        isCalculated: false,
        rows: [],
      };
      return;
    }

    const rows = aggregateEntries(parsedResult.entries);
    isDetailsOpen.value = true;

    resultState.value = {
      isCalculated: true,
      totalAmount: parsedResult.total,
      entryCount: parsedResult.totalEntries,
      uniqueNames: parsedResult.totalNames,
      calculatedAt: formatTime(),
      rows,
    };
  } finally {
    isProcessing.value = false;
  }
};

const onClearClick = () => {
  moneySnapInput.value = '';
  validationErrors.value = [];
  resultState.value = {
    isCalculated: false,
    totalAmount: 0,
    entryCount: 0,
    uniqueNames: 0,
    calculatedAt: '',
    rows: [],
  };
};

const onLoginSaveClick = async () => {
  await navigateTo('/');
};
</script>

<style scoped>
@reference "~/assets/css/main.css";

.current-settings {
  @apply text-center;
}
.current-settings ::v-deep(.app-button) {
  @apply rounded-full text-muted bg-bg pl-3 pr-1.5 py-3 inline-block;
}
.current-settings ::v-deep(.app-button span) {
  @apply rounded-full text-ink bg-surface ml-2 p-2;
}

.instruction {
  @apply flex flex-col gap-4 text-sm;
}

.instruction ul {
  @apply list-decimal list-outside pl-4 text-accent;
}
.instruction .instruction--tips ul {
  list-style-type: 'ฅ ';
}
.instruction ul li p {
  @apply text-ink;
}

.result-placeholder {
  @apply p-6 min-h-70;
}
.result-placeholder__text {
  @apply text-lg;
}

.result-area {
  @apply flex flex-col gap-4;
}
.result-area__denoms {
  @apply flex flex-col gap-3;
}
.result-area__section-title {
  @apply px-2 pt-1 text-btn text-ink;
}
.result-area__bills {
  @apply grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3;
}
.result-area__coins {
  @apply grid grid-cols-5 gap-2 max-w-110;
}
.result-area__unit {
  @apply px-2 text-xs text-muted;
}
.result-area__details {
  @apply overflow-hidden rounded-3xl bg-surface;
}
/* DS height 54 → 16px text (24px line) + 16px ×2 = 56 */
.result-area__details-toggle {
  @apply flex w-full items-center justify-between px-5 py-4 text-btn leading-6 text-ink cursor-pointer;
}
.result-area__details-hint {
  @apply text-body-sm text-muted;
}
.summary-card__rows {
  @apply flex flex-col gap-2 px-3 pb-3;
}
/* DS row: soft bg, radius 16, padding 10px 14px → 12px 16px */
.summary-card__row {
  @apply flex flex-col gap-1 rounded-row bg-soft px-4 py-3;
}
.summary-card__row-head {
  @apply flex items-baseline justify-between;
}
.summary-card__row-head span:first-child {
  @apply text-body-sm font-medium;
}
.summary-card__row-head span:last-child {
  @apply text-btn;
}
.summary-card__row-body {
  @apply flex flex-wrap gap-2 pt-1;
}

.money-snap {
  @apply flex flex-col gap-2;
}
.money-snap__notices {
  @apply flex justify-between items-center;
}
.money-snap__errors {
  @apply flex flex-col gap-1;
}

.action-buttons {
  @apply flex grow gap-2;
}
</style>