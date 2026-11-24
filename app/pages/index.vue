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
            <p class="text-ink text-lg">現在支援<span class="text-accent-dark">{{ formatLabel }}</span>資料</p>
            <p class="text-muted text-base">按照下面提示的格式交出你的資料</p>
          </div>

          <!-- Current settings (members only — guests use the 偏好設定 tab on the left edge) -->
          <div v-if="isLogin" class="current-settings">
            <app-button
              variant="secondary"
              size="sm"
              class="text-xs rounded-full text-muted bg-bg"
              :label="`目前設定：${formatLabel} · ${denominations} 種面額`"
              @click="onCurrentSettingsClick"
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
                <li v-if="includesNames" class="my-1">
                  <p>每一行只能有一筆姓名,金額（手動輸入用逗號；從試算表複製貼上會自動辨識）。例如：張三,18500。</p>
                </li>
                <li v-else class="my-1">
                  <p>每一行只能有一筆金額。例如：18500。</p>
                </li>
                <li class="my-1">
                  <p>每次最多可貼入 {{ MAX_ENTRIES }} 筆。</p>
                </li>
                <li class="my-1">
                  <p>每筆金額之整數部分上限為 {{ formatAmount(MAX_AMOUNT_PER_ENTRY) }}。</p>
                </li>
                <template v-if="includesNames">
                  <li class="my-1">
                    <p>姓名可重複多筆，系統會自動加總（每人合計上限同為 {{ formatAmount(MAX_AMOUNT_PER_ENTRY) }}）。</p>
                  </li>
                  <li class="my-1">
                    <p>姓名最多 {{ MAX_NAME_LENGTH }} 字；金額只能是正整數，前後只能加幣別或單位（如 NT$、元）。</p>
                  </li>
                </template>
                <li v-else class="my-1">
                  <p>金額只能是正整數，前後只能加幣別或單位（如 NT$、元）。</p>
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
              <app-chip class="money-snap__counter" :tone="entryCount > MAX_ENTRIES ? 'warn' : 'soft'">
                已貼 {{ entryCount }} / {{ formatAmount(MAX_ENTRIES) }} 筆
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
        <!-- Too many entries: offer to calculate the first MAX_ENTRIES or copy the rest -->
        <app-cat-ear-card v-if="isOver" class="over-card">
          <div class="over-card__content">
            <app-illustration-slot class="over-card__art" label="貓咪插畫：被一疊鈔票壓住" :stripe="8" />
            <div class="over-card__text">
              <h2 class="over-card__title">太多了喵，算不動 (=ΦдΦ=)</h2>
              <p class="over-card__desc">
                你貼了 <b class="text-ink">{{ formatAmount(entryCount) }}</b> 筆，每次最多只支援
                {{ formatAmount(MAX_ENTRIES) }} 筆，多出 <b class="text-warn-text">{{ formatAmount(extraCount) }}</b> 筆。
              </p>
            </div>
            <div class="over-card__split">
              <div class="over-card__split-item">
                <span class="over-card__split-label">這次先算</span>
                <span class="over-card__split-value">{{ formatAmount(MAX_ENTRIES) }} 筆</span>
              </div>
              <span class="over-card__split-plus" aria-hidden="true">＋</span>
              <div class="over-card__split-item">
                <span class="over-card__split-label">下一批</span>
                <span class="over-card__split-value text-warn-text">{{ formatAmount(extraCount) }} 筆</span>
              </div>
            </div>
            <app-button variant="primary" full :label="calcFirstLabel" @click="onCalcFirstClick" />
            <app-button variant="secondary" full :label="copyRestLabel" @click="onCopyRestClick" />
          </div>
        </app-cat-ear-card>

        <app-illustration-slot
          v-else-if="!resultState.isCalculated"
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
          >
            <!-- Only the first MAX_ENTRIES were calculated: offer the next batch -->
            <div v-if="truncatedCount" class="truncated-notice">
              <span class="truncated-notice__text">
                只算了前 {{ formatAmount(MAX_ENTRIES) }} 筆，還有 {{ formatAmount(truncatedCount) }} 筆等下一批喵。
              </span>
              <app-button
                v-if="pendingLines.length"
                variant="primary"
                size="sm"
                :label="`算下一批 ${formatAmount(pendingLines.length)} 筆 ›`"
                @click="onNextBatchClick"
              />
            </div>
          </app-total-card>

          <!-- A needed small denomination is turned off: say how much is left and how to fix it -->
          <app-alert v-if="remainderNotice" class="result-area__remainder">
            {{ remainderNotice }}
          </app-alert>

          <!-- Export actions -->
          <div class="result-area__actions">
            <app-action-tile glyph="⧉" label="複製領款單" @click="onCopySlipClick" />
            <app-action-tile glyph="▣" label="下載明細圖" @click="onDownloadImageClick" />
            <app-action-tile glyph="↓" label="匯出 CSV" @click="onExportCsvClick" />
          </div>

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
              <li v-for="row in resultRows" :key="row.name" class="summary-card__row">
                <div class="summary-card__row-head">
                  <span>{{ row.name }}</span>
                  <span>{{ formatAmount(row.total) }} {{ CurrencyUnit.Dollar }}</span>
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

    <!-- Clipboard blocked: let the user copy the remaining lines by hand -->
    <app-dialog :open="!!copyBox" :title="copyBox?.title" closable @close="copyBox = null">
      <p class="copy-box__hint">
        瀏覽器不讓喵直接複製 (ΦдΦ) 文字已經幫你選好了：電腦按 Ctrl+C（Mac 按 ⌘C），手機長按後選「拷貝」。
      </p>
      <app-textarea
        class="copy-box__text"
        aria-label="要複製的文字"
        readonly
        :rows="9"
        :model-value="copyBox?.text"
        @focus="onCopyBoxSelect"
        @click="onCopyBoxSelect"
      />
      <app-button variant="strong" full label="複製好了" @click="copyBox = null" />
    </app-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { CurrencyUnit } from '~/constants/currency';
import { RouteName } from '~/constants/navigation';
import { usePreferences } from '~/composables/usePreferences';
import { formatDenominationLabel } from '~/utils/preferences';
import { DenomCellState, DenomKind } from '~/types/denomination';
import {
  ALL_DENOMINATIONS,
  calculateDenominations,
  countEntryLines,
  isBill,
  MAX_AMOUNT_PER_ENTRY,
  MAX_ENTRIES,
  MAX_NAME_LENGTH,
  parseMoneySnap,
  splitEntryLines,
  type ParsedEntry,
} from '~/utils/moneyParser';
import {
  buildCsv,
  buildExportFileName,
  buildSlipImageModel,
  buildSlipText,
  ExportExt,
} from '~/utils/exporters';
import { copyText, createCsvBlob, downloadBlob, drawSlipImage } from '~/utils/download';

// Composables
const { user } = useAuth();
const { showToast } = useToast();
const { preferences } = usePreferences();

interface IDenominationItem {
  denomination: number;
  count: number;
}

interface IResultTotal {
  name: string;
  total: number;
}

interface IResultRow extends IResultTotal {
  /** Non-zero denominations only, smallest → largest */
  items: IDenominationItem[];
  /** Amount the enabled denominations cannot make */
  remainder: number;
}

const MAX_VISIBLE_ERRORS = 5;
// How long the copy-rest button reads 「已複製 ✓」
const COPIED_LABEL_MS = 1600;

const EXPORT_MESSAGES = {
  copyDone: '領款單已複製，可以貼給銀行了喵',
  copyFailed: '複製失敗了喵，再試一次看看',
  imageDone: '明細圖下載好了喵',
  imageFailed: '明細圖下載失敗了喵，再試一次看看',
  csvDone: 'CSV 匯出好了喵',
  csvFailed: 'CSV 匯出失敗了喵，再試一次看看',
} as const;

const nextBatchMessage = (count: number) => `已帶入下一批 ${formatAmount(count)} 筆並算好了喵`;

// State
const isLogin = computed(() => !!user.value);
// 偏好設定: enabled denominations (large → small) and the data format
const activeDenominations = computed(() => preferences.value.denominations);
const denominations = computed(() => activeDenominations.value.length);
const includesNames = computed(() => preferences.value.includesNames);
const formatLabel = computed(() => (includesNames.value ? '姓名,金額' : '純金額'));
const isProcessing = ref(false);
const moneySnapInput = ref('');
const validationErrors = ref<string[]>([]);
const isDetailsOpen = ref(true);
// Full date of the last calculation, for the image slip
const calculatedDate = ref<Date | null>(null);
// More than MAX_ENTRIES pasted: the "too many" card replaces the placeholder
const isOver = ref(false);
// Entries left out by 「只算前 1,000 筆」 (truncatedCount) and the lines still to calculate
const truncatedCount = ref(0);
const pendingLines = ref<string[]>([]);
const isRestCopied = ref(false);
// Manual-copy dialog when the clipboard is blocked
const copyBox = ref<{ title: string; text: string } | null>(null);

// Result state - explicit "not calculated" vs "calculated" behavior
const resultState = ref({
  isCalculated: false,
  totalAmount: 0,
  entryCount: 0,
  uniqueNames: 0,
  calculatedAt: '',
  /** Data format used by the calculation (for the summary chip) */
  includesNames: true,
  rows: [] as IResultTotal[],
});

// Computed properties
// Header row + non-blank entry lines; the count may exceed MAX_ENTRIES (→ "too many" card on calculate)
const entrySplit = computed(() =>
  splitEntryLines(moneySnapInput.value, { includesNames: includesNames.value }),
);
const entryCount = computed(() => entrySplit.value.lines.length);
const extraCount = computed(() => Math.max(0, entryCount.value - MAX_ENTRIES));

const calcFirstLabel = computed(() =>
  isLogin.value
    ? `只算前 ${formatAmount(MAX_ENTRIES)} 筆並存檔`
    : `只算前 ${formatAmount(MAX_ENTRIES)} 筆`,
);
const copyRestLabel = computed(() =>
  isRestCopied.value
    ? '已複製 ✓'
    : `複製第 ${formatAmount(MAX_ENTRIES + 1)} 筆之後的 ${formatAmount(extraCount.value)} 筆`,
);

// Line errors start with 「第 N 行」; anything else (e.g. the generic format message) is shown as-is.
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

const placeholderText = computed(() =>
  includesNames.value
    ? '張三,18500\n李四,"45,800"\n王五,NT$32,000\n張三,1999'
    : '18500\n"45,800"\nNT$32,000\n1999',
);


const summaryChips = computed(() => {
  const { entryCount, uniqueNames, calculatedAt } = resultState.value;
  const formatChip = resultState.value.includesNames ? '姓名,金額' : '純金額';
  const chips = [`總筆數：${entryCount} 筆 · ${uniqueNames} 人`, formatChip];
  if (calculatedAt) chips.push(`計算時間 ${calculatedAt}`);
  return chips;
});

// Breakdown per person, always with the current 偏好設定 denominations
const resultRows = computed<IResultRow[]>(() =>
  resultState.value.rows.map((row) => {
    const breakdown = calculateDenominations(row.total, activeDenominations.value);
    return {
      ...row,
      items: toDenominationItems(breakdown.denominations),
      remainder: breakdown.remainder,
    };
  }),
);

/**
 * Remainder warning: total left over and the smallest turned-off denomination that would have
 * been needed (a remainder is always below the smallest enabled one, so every denomination the
 * full breakdown uses for it is a turned-off one — usually NT$1).
 */
const remainderNotice = computed(() => {
  const rows = resultRows.value.filter((row) => row.remainder > 0);
  if (!rows.length) return '';
  const total = rows.reduce((sum, row) => sum + row.remainder, 0);
  const needed = Math.min(
    ...rows.flatMap((row) =>
      Object.entries(calculateDenominations(row.remainder, ALL_DENOMINATIONS).denominations)
        .filter(([, count]) => count > 0)
        .map(([value]) => Number(value)),
    ),
  );
  const fix = isLogin.value ? '到設定頁把它打開吧。' : '到左邊的偏好設定把它打開吧。';
  return `還有 ${formatAmount(total)} ${CurrencyUnit.Dollar}找不開喵，因為你關掉了 ${formatDenominationLabel(needed)}。${fix}`;
});

// Totals per denomination across everyone (bills large → small, then coins)
const denominationTotals = computed(() => {
  const totals: Record<number, number> = {};
  resultRows.value.forEach((row) => {
    row.items.forEach(({ denomination, count }) => {
      totals[denomination] = (totals[denomination] ?? 0) + count;
    });
  });
  return totals;
});

// DS: the most-used bill is highlighted (ties → the larger bill); no highlight when no bills are used
const billCells = computed(() => {
  const cells = activeDenominations.value.filter(isBill).map((value) => ({
    value,
    count: denominationTotals.value[value] ?? 0,
    isTop: false,
  }));
  // No bills enabled (coins only) → no cells and no highlight
  const top = cells.reduce<(typeof cells)[number] | undefined>(
    (best, cell) => (!best || cell.count > best.count ? cell : best),
    undefined,
  );
  if (top && top.count > 0) top.isTop = true;
  return cells;
});

const coinCells = computed(() =>
  activeDenominations.value.filter((value) => !isBill(value)).map((value) => ({
    value,
    count: denominationTotals.value[value] ?? 0,
  })),
);

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-US').format(amount);
};

// Smallest → largest, zero counts dropped
const toDenominationItems = (denominations: Record<number, number>): IDenominationItem[] =>
  [...activeDenominations.value]
    .sort((a, b) => a - b)
    .map((denomination) => ({ denomination, count: denominations[denomination] ?? 0 }))
    .filter((item) => item.count > 0);

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-TW', {
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

  return Array.from(resultMap.entries()).map(([name, total]) => ({ name, total }));
};

const emptyResultState = () => ({
  isCalculated: false,
  totalAmount: 0,
  entryCount: 0,
  uniqueNames: 0,
  calculatedAt: '',
  includesNames: includesNames.value,
  rows: [] as IResultTotal[],
});

const resetBatchState = () => {
  isOver.value = false;
  truncatedCount.value = 0;
  pendingLines.value = [];
};

// Parse and show the result for `input`; returns whether it was calculated
const runCalculation = (input: string): boolean => {
  isProcessing.value = true;
  validationErrors.value = [];

  try {
    const parsedResult = parseMoneySnap(input, { includesNames: includesNames.value });

    if (!parsedResult.success) {
      validationErrors.value = parsedResult.errors.length
        ? parsedResult.errors
        : ['請輸入正確的資料格式'];
      resultState.value = {
        ...resultState.value,
        isCalculated: false,
        rows: [],
      };
      return false;
    }

    if (parsedResult.errors.length) {
      validationErrors.value = parsedResult.errors;
      resultState.value = {
        ...resultState.value,
        isCalculated: false,
        rows: [],
      };
      return false;
    }

    const rows = aggregateEntries(parsedResult.entries);
    isDetailsOpen.value = true;
    calculatedDate.value = new Date();

    resultState.value = {
      isCalculated: true,
      totalAmount: parsedResult.total,
      entryCount: parsedResult.totalEntries,
      uniqueNames: parsedResult.totalNames,
      calculatedAt: formatTime(calculatedDate.value),
      includesNames: includesNames.value,
      rows,
    };
    return true;
  } finally {
    isProcessing.value = false;
  }
};

// Too many entries: no parsing, clear the old result and show the "too many" card
const showOver = () => {
  validationErrors.value = [];
  resultState.value = emptyResultState();
  isOver.value = true;
};

const onCalculateClick = () => {
  resetBatchState();
  if (entryCount.value > MAX_ENTRIES) {
    showOver();
    return;
  }
  runCalculation(moneySnapInput.value);
};

// Calculate the first MAX_ENTRIES lines (header kept) and keep the rest as the next batch
const onCalcFirstClick = () => {
  const { header, lines } = entrySplit.value;
  const firstBatch = lines.slice(0, MAX_ENTRIES);
  const rest = lines.slice(MAX_ENTRIES);
  resetBatchState();
  const input = (header ? [header, ...firstBatch] : firstBatch).join('\n');
  if (runCalculation(input)) {
    truncatedCount.value = rest.length;
    pendingLines.value = rest;
  }
};

// The pending lines become the new input: too many again → "too many" card, otherwise calculate
const onNextBatchClick = () => {
  const rest = pendingLines.value;
  if (!rest.length) return;
  resetBatchState();
  moneySnapInput.value = rest.join('\n');
  if (rest.length > MAX_ENTRIES) {
    showOver();
    return;
  }
  // TODO(records): members should save the next batch as a new record once records exist
  if (runCalculation(moneySnapInput.value)) showToast(nextBatchMessage(rest.length));
};

const onCopyRestClick = async () => {
  const count = extraCount.value;
  const text = entrySplit.value.lines.slice(MAX_ENTRIES).join('\n');
  const copied = await copyText(text);
  if (!copied) {
    copyBox.value = { title: `複製剩下的 ${formatAmount(count)} 筆`, text };
    return;
  }
  isRestCopied.value = true;
  setTimeout(() => {
    isRestCopied.value = false;
  }, COPIED_LABEL_MS);
};

const onCopyBoxSelect = (event: Event) => {
  (event.target as HTMLTextAreaElement).select();
};

const onClearClick = () => {
  moneySnapInput.value = '';
  validationErrors.value = [];
  resetBatchState();
  resultState.value = emptyResultState();
};

// Export actions: all use the denominations the calculation used
const slipInput = () => ({
  totalAmount: resultState.value.totalAmount,
  totals: denominationTotals.value,
  denominations: activeDenominations.value,
});

const onCopySlipClick = async () => {
  const copied = await copyText(buildSlipText(slipInput()));
  showToast(copied ? EXPORT_MESSAGES.copyDone : EXPORT_MESSAGES.copyFailed);
};

const onDownloadImageClick = async () => {
  try {
    const model = buildSlipImageModel({
      ...slipInput(),
      calculatedAt: calculatedDate.value ?? new Date(),
      entryCount: resultState.value.entryCount,
    });
    const blob = await drawSlipImage(model);
    downloadBlob(blob, buildExportFileName(ExportExt.Png, new Date()));
    showToast(EXPORT_MESSAGES.imageDone);
  } catch {
    showToast(EXPORT_MESSAGES.imageFailed);
  }
};

const onExportCsvClick = () => {
  try {
    const csv = buildCsv({
      rows: resultRows.value,
      totalAmount: resultState.value.totalAmount,
      denominations: activeDenominations.value,
      // Mode the calculation used (編號 vs 姓名 header)
      includesNames: resultState.value.includesNames,
    });
    downloadBlob(createCsvBlob(csv), buildExportFileName(ExportExt.Csv, new Date()));
    showToast(EXPORT_MESSAGES.csvDone);
  } catch {
    showToast(EXPORT_MESSAGES.csvFailed);
  }
};

const onCurrentSettingsClick = async () => {
  await navigateTo({ name: RouteName.Settings });
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

.over-card__content {
  @apply flex flex-col gap-4;
}
.over-card__art {
  @apply min-h-30;
}
.over-card__text {
  @apply flex flex-col gap-2 text-center;
}
.over-card__title {
  @apply text-h2 text-ink;
}
.over-card__desc {
  @apply text-body-sm text-ink-2;
}
/* DS: soft row, radius 20, padding 14px 16px → 12px 16px */
.over-card__split {
  @apply grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-soft px-4 py-3;
}
.over-card__split-item {
  @apply flex flex-col items-center;
}
.over-card__split-label {
  @apply text-xs text-muted;
}
/* DS 24px → closest token h2 (22) */
.over-card__split-value {
  @apply text-h2 text-ink;
}
.over-card__split-plus {
  @apply text-lg text-faint;
}

/* DS: hero-chip row, radius 18 → 16, padding 8px 8px 8px 14px → 8px 8px 8px 16px */
.truncated-notice {
  @apply flex flex-wrap items-center justify-between gap-3 rounded-row bg-hero-chip py-2 pr-2 pl-4;
}
.truncated-notice__text {
  @apply text-sm text-hero-chip-text;
}

.copy-box__hint {
  @apply text-sm text-ink-2;
}
.copy-box__text {
  @apply resize-none;
}
.result-area__actions {
  @apply grid grid-cols-3 gap-2;
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