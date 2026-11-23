<template>
  <div class="page-index">
    <div class="page-index__header" />
    <div class="page-index__body grid grid-cols-2 gap-6">
      <!-- Input Card -->
      <app-cat-card>
        <div class="flex flex-col gap-4">
          <!-- Header -->
          <div class="flex flex-col gap-1 text-center">
            <p class="text-ink text-lg">現在支援<span class="text-accent-dark">姓名,金額</span>資料</p>
            <p class="text-muted text-base">按照下面提示的格式交出你的資料</p>
          </div>

          <!-- Current Settings (Logged In Only) -->
          <div v-if="isLogin" class="current-settings">
            <app-button
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
            <textarea
              v-model="moneySnapInput"
              class="money-snap__textarea"
              :placeholder="placeholderText"
              :disabled="isProcessing"
              :readonly="resultState.isCalculated"
            />
            <div class="money-snap__notices">
              <app-button
                class="text-xs rounded-full text-muted bg-bg"
                label="↑ 匯入 CSV"
                :disabled="isProcessing"
              />
              <span class="text-muted">已貼 {{ entryCount }} / 1,000 筆</span>
            </div>
            <ul v-if="validationErrors.length" class="money-snap__errors">
              <li v-for="error in validationErrors" :key="error">{{ error }}</li>
            </ul>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <!-- Logged In: Calculate & Save OR Clear -->
            <template v-if="isLogin">
              <app-button
                v-if="!resultState.isCalculated"
                class="primary-button"
                label="計算並存檔 ฅ^•ﻌ•^ฅ"
                :disabled="!canCalculate || isProcessing"
                @click="onCalculateClick"
              />
              <app-button
                v-else
                label="清除資料，算下一筆"
                :disabled="isProcessing"
                @click="onClearClick"
              />
            </template>

            <!-- Not Logged In: Calculate OR Login -->
            <template v-else>
              <template v-if="!resultState.isCalculated">
                <app-button
                  class="primary-button"
                  label="直接計算"
                  :disabled="!canCalculate || isProcessing"
                  @click="onCalculateClick"
                />
                <app-button
                  class="rounded-full text-bg bg-ink"
                  label="登入存檔 ฅ^•ﻌ•^ฅ"
                  :disabled="isProcessing"
                  @click="onLoginSaveClick"
                />
              </template>
              <app-button
                v-else
                label="清除資料，算下一筆"
                :disabled="isProcessing"
                @click="onClearClick"
              />
            </template>
          </div>
        </div>
      </app-cat-card>

      <!-- Summary Card -->
      <div>
        <app-cat-card
          :bgColor="summaryCard.bgColor"
          :textColor="summaryCard.textColor"
        >
          <div class="summary-card flex flex-col gap-4">
            <!-- Result State: Not Calculated -->
            <template v-if="!resultState.isCalculated">
              <div class="summary-card__placeholder">
                <p class="text-muted text-sm">粘貼資料後，點擊「計算」以查看結果</p>
              </div>
            </template>

            <!-- Result State: Calculated -->
            <template v-else>
              <div class="flex justify-between items-end gap-3">
                <span>總金額</span>
                <p>
                  <span class="text-accent-dark text-4xl mr-1">{{ formatAmount(resultState.totalAmount) }}</span>元
                </p>
              </div>
              <div class="summary-card__meta">
                <span>總筆數：{{ resultState.entryCount }} 筆 · {{ resultState.uniqueNames }} 人</span>
                <span>姓名,金額</span>
                <span v-if="resultState.calculatedAt">計算時間 {{ resultState.calculatedAt }}</span>
              </div>
              <ul class="summary-card__rows">
                <li v-for="row in resultState.rows" :key="row.name" class="summary-card__row">
                  <div class="summary-card__row-head">
                    <span>{{ row.name }}</span>
                    <span>{{ formatAmount(row.total) }} 元</span>
                  </div>
                  <div class="summary-card__row-body">
                    <span v-for="(count, denom) in row.denominations" :key="`${row.name}-${denom}`">
                      {{ denom }}×{{ count }}
                    </span>
                  </div>
                </li>
              </ul>
            </template>
          </div>
        </app-cat-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  calculateDenominations,
  countEntryLines,
  DENOMINATIONS,
  parseMoneySnap,
  type ParsedEntry,
} from '~/utils/moneyParser';

// Composables
const { theme } = useTheme();
const { user } = useAuth();

interface IResultRow {
  name: string;
  total: number;
  denominations: Record<number, number>;
}

// State
const isLogin = computed(() => !!user.value);
const denominations = computed(() => DENOMINATIONS.length);
const isProcessing = ref(false);
const moneySnapInput = ref('');
const validationErrors = ref<string[]>([]);

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

const canCalculate = computed(() => {
  return moneySnapInput.value.trim().length > 0;
});

const placeholderText = computed(() => {
  return '張三,18500\n李四,"45,800"\n王五,NT$32,000\n張三,1999';
});

const summaryCard = computed(() => {
  return {
    bgColor: theme.value === 'light' ? 'ink' : 'surface',
    textColor: theme.value === 'light' ? 'bg' : 'ink'
  };
});

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-US').format(amount);
};

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
    denominations: calculateDenominations(total).denominations,
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

.summary-card__placeholder {
  @apply py-8 text-center;
}
.summary-card__placeholder p {
  @apply text-muted text-sm;
}

.summary-card__meta {
  @apply flex gap-2;
}
.summary-card__meta span {
  @apply bg-muted dark:bg-bg text-bg dark:text-muted px-3 py-1 rounded-full text-sm;
}
.summary-card__rows {
  @apply flex flex-col gap-2;
}
.summary-card__row {
  @apply bg-muted dark:bg-bg text-bg dark:text-muted rounded-xl p-3;
}
.summary-card__row-head {
  @apply flex justify-between font-bold text-sm;
}
.summary-card__row-body {
  @apply flex flex-wrap gap-2 mt-2 text-xs;
}

.money-snap {
  @apply flex flex-col gap-2;
}
.money-snap__textarea {
  @apply rounded-2xl border border-line border-dashed border-2 text-ink p-4;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  min-height: 160px;
}
.money-snap__notices {
  @apply flex justify-between items-center;
}
.money-snap__notices ::v-deep(.app-button),
.money-snap__notices span {
  @apply rounded-full bg-bg text-sm;
}
.money-snap__notices ::v-deep(.app-button) {
  @apply text-ink p-3 inline-block;
}
.money-snap__notices span {
  @apply text-muted px-3 py-1;
}
.money-snap__errors {
  @apply text-warning-text text-xs list-disc list-inside;
}

.action-buttons {
  @apply flex grow gap-2;
}
.action-buttons ::v-deep(.app-button) {
  @apply bg-bg dark:text-ink basis-full;
}
.action-buttons ::v-deep(.app-button):disabled {
  @apply opacity-50 cursor-not-allowed;
}
.action-buttons ::v-deep(.app-button) ~ .app-button {
  @apply bg-ink text-bg hover:bg-[#2a1d17];
}
.action-buttons .primary-button {
  @apply text-ink bg-accent;
}

.login-prompt {
  @apply flex items-center justify-center;
}
.login-prompt p {
  @apply text-muted;
}
</style>