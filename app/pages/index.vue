<template>
  <div class="page-index">
    <!-- DS: one column under 900px, two columns from 900px (desktop: breakpoint) -->
    <div class="page-index__body grid grid-cols-1 gap-6 desktop:grid-cols-2">
      <!-- Input Card -->
      <app-cat-ear-card>
        <div class="flex flex-col gap-4">
          <!-- Header -->
          <div class="flex flex-col gap-1 text-center">
            <p class="text-ink text-lg">現在支援<span class="text-accent-dark">{{ formatLabel }}</span>資料</p>
            <p class="text-muted text-body-md">按照下面提示的格式交出你的資料</p>
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
          <home-instructions :includes-names="includesNames" />

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
                :disabled="isProcessing || resultState.isCalculated"
                @click="onImportCsvClick"
              />
              <input
                ref="csvFileInput"
                class="money-snap__file"
                type="file"
                :accept="CSV_ACCEPT"
                tabindex="-1"
                aria-hidden="true"
                @change="onCsvFileChange"
              />
              <app-chip class="money-snap__counter" :tone="entryCount > MAX_ENTRIES ? 'warn' : 'soft'">
                已貼 {{ entryCount }} / {{ formatNumber(MAX_ENTRIES) }} 筆
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
          <!-- Members: tell them what 計算並存檔 keeps in the cloud (docs/database.md §5) -->
          <p v-if="isLogin && !resultState.isCalculated" class="save-note">{{ saveNote }}</p>
        </div>
      </app-cat-ear-card>

      <!-- Result: illustration placeholder until calculated, then the dark total card
           (DS: only one heaviest element per screen) -->
      <div>
        <!-- Too many entries: offer to calculate the first MAX_ENTRIES or copy the rest -->
        <home-over-card
          v-if="isOver"
          :entry-count="entryCount"
          :is-login="isLogin"
          :is-rest-copied="isRestCopied"
          @calc-first="onCalcFirstClick"
          @copy-rest="onCopyRestClick"
        />

        <app-empty-state v-else-if="!resultState.isCalculated" class="result-placeholder" message="算好的結果會出現在這裡喵">
          <img src="~/assets/images/tabby-cat-lying-stretched.svg" alt="貓咪插畫：橘白貓趴著等" />
        </app-empty-state>

        <div v-else class="result-area">
          <app-total-card
            class="summary-card"
            :amount="formatNumber(resultState.totalAmount)"
            :chips="summaryChips"
          >
            <!-- Only the first MAX_ENTRIES were calculated: offer the next batch -->
            <div v-if="truncatedCount" class="truncated-notice">
              <span class="truncated-notice__text">
                只算了前 {{ formatNumber(MAX_ENTRIES) }} 筆，還有 {{ formatNumber(truncatedCount) }} 筆等下一批喵。
              </span>
              <app-button
                v-if="pendingLines.length"
                variant="primary"
                size="sm"
                :label="`算下一批 ${formatNumber(pendingLines.length)} 筆 ›`"
                @click="onNextBatchClick"
              />
            </div>
          </app-total-card>

          <!-- Members: the record didn't reach the cloud — keep the result and offer to save it again -->
          <app-alert v-if="unsavedBatch !== null" class="result-area__save-error" :title="RECORD_MESSAGES.saveFailed">
            <div class="save-error">
              <span>{{ RECORD_MESSAGES.saveFailedHint }}</span>
              <app-button
                variant="primary"
                size="sm"
                label="再存一次"
                :disabled="isRetryingSave"
                @click="onRetrySaveClick"
              />
            </div>
          </app-alert>

          <!-- A needed small denomination is turned off: say how much is left and how to fix it -->
          <app-alert v-if="remainderNotice" class="result-area__remainder">
            {{ remainderNotice }}
          </app-alert>

          <!-- Export actions -->
          <div class="result-area__actions">
            <app-action-tile glyph="⧉" label="複製領款單" @click="copySlip" />
            <app-action-tile glyph="▣" label="下載明細圖" @click="downloadImage" />
            <app-action-tile glyph="↓" label="匯出 CSV" @click="exportCsv" />
          </div>

          <home-result-breakdown
            v-model:details-open="isDetailsOpen"
            :bill-cells="billCells"
            :coin-cells="coinCells"
            :rows="resultRows"
          />
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
import { formatNumber } from '~/utils/format';
import { computed, ref, useTemplateRef } from 'vue';
import { CSV_ACCEPT, CsvFileError, readCsvFile } from '~/utils/csvFile';

import { CurrencyUnit } from '~/constants/currency';
import { RouteName } from '~/constants/navigation';
import { AnalyticsEvent, AnalyticsResult } from '~/constants/analytics';
import { BATCH_DEFAULT, BATCH_OFFSET, PASTE_FORMAT_LABEL } from '~/constants/record';

import { usePreferences } from '~/composables/usePreferences';

import type { IResultTotal } from '~/types/denomination';
import { useResultBreakdown } from '~/composables/useResultBreakdown';
import { useResultExports } from '~/composables/useResultExports';
import { ModalName, useModal } from '~/composables/useModal';

import { formatDenominationLabel } from '~/utils/preferences';
import { MAX_ENTRIES, parseMoneySnap, splitEntryLines, type ParsedEntry } from '~/utils/moneyParser';
import { copyText } from '~/utils/download';
import { insertRecord, buildRecordName, toInputFormat } from '~/utils/records';

// Composables
const { user } = useAuth();
const { showToast } = useToast();
const { preferences } = usePreferences();
const { gtag } = useGtag();

const MAX_VISIBLE_ERRORS = 5;
// How long the copy-rest button reads 「已複製 ✓」
const COPIED_LABEL_MS = 1600;

const IMPORT_MESSAGES: Record<CsvFileError, string> = {
  [CsvFileError.TooLarge]: '檔案太大了喵，最多 1 MB',
  [CsvFileError.Unreadable]: '這個檔案讀不出來喵，換一個 CSV 試試',
};

const RECORD_MESSAGES = {
  saveFailed: '紀錄沒有存成功喵',
  saveFailedHint: '結果還在畫面上，可以再存一次',
  saveNoteWithNames: '計算結果（含姓名與金額）會存在雲端 2 年，只有你看得到',
  saveNoteAmountOnly: '計算結果會存在雲端 2 年，只有你看得到'
} as const;

const nextBatchMessage = (count: number) => `已帶入下一批 ${formatNumber(count)} 筆並算好了喵`;

// State
const isLogin = computed(() => !!user.value);
// 偏好設定: enabled denominations (large → small) and the data format
const activeDenominations = computed(() => preferences.value.denominations);
const denominations = computed(() => activeDenominations.value.length);
const includesNames = computed(() => preferences.value.includesNames);
const formatLabel = computed(() => PASTE_FORMAT_LABEL[toInputFormat(includesNames.value)]);
const saveNote = computed(() =>
  includesNames.value ? RECORD_MESSAGES.saveNoteWithNames : RECORD_MESSAGES.saveNoteAmountOnly
);

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

const saveRecordBatch = ref(BATCH_DEFAULT);
// The batch whose record failed to save (再存一次 sends it again); null when nothing is waiting
const unsavedBatch = ref<number | null>(null);
const isRetryingSave = ref(false);

// Computed properties
// Header row + non-blank entry lines; the count may exceed MAX_ENTRIES (→ "too many" card on calculate)
const entrySplit = computed(() =>
  splitEntryLines(moneySnapInput.value, { includesNames: includesNames.value }),
);
const entryCount = computed(() => entrySplit.value.lines.length);
const extraCount = computed(() => Math.max(0, entryCount.value - MAX_ENTRIES));

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
  const formatChip = PASTE_FORMAT_LABEL[toInputFormat(resultState.value.includesNames)];
  const chips = [`總筆數：${entryCount} 筆 · ${uniqueNames} 人`, formatChip];
  if (calculatedAt) chips.push(`計算時間 ${calculatedAt}`);
  return chips;
});

const { resultRows, denominationTotals, billCells, coinCells, remainder } = useResultBreakdown(
  computed(() => resultState.value.rows),
  activeDenominations,
);

// A needed small denomination is turned off: how much is left and where to turn it on
const remainderNotice = computed(() => {
  if (!remainder.value) return '';
  const { total, needed } = remainder.value;
  const fix = isLogin.value ? '到設定頁把它打開吧。' : '到左邊的偏好設定把它打開吧。';
  return `還有 ${formatNumber(total)} ${CurrencyUnit.Dollar}找不開喵，因為你關掉了 ${formatDenominationLabel(needed)}。${fix}`;
});

const { copySlip, downloadImage, exportCsv } = useResultExports({
  totalAmount: computed(() => resultState.value.totalAmount),
  entryCount: computed(() => resultState.value.entryCount),
  includesNames: computed(() => resultState.value.includesNames),
  calculatedDate,
  rows: resultRows,
  totals: denominationTotals,
  denominations: activeDenominations,
});

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
  unsavedBatch.value = null;
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

const saveRecord = async (batch: number) => {
  try {
    await insertRecord({
      name: buildRecordName(calculatedDate.value ?? new Date(), batch),
      inputFormat: toInputFormat(resultState.value.includesNames),
      entryCount: resultState.value.entryCount,
      totalAmount: resultState.value.totalAmount,
      denominations: activeDenominations.value,
      denominationCounts: denominationTotals.value,
      rows: resultState.value.rows,
    });
    unsavedBatch.value = null;
  } catch (error) {
    unsavedBatch.value = batch;
    console.error('Failed to save record:', error);
  }
};

const onRetrySaveClick = async () => {
  if (unsavedBatch.value === null) return;
  isRetryingSave.value = true;
  await saveRecord(unsavedBatch.value);
  isRetryingSave.value = false;
};

// Too many entries: no parsing, clear the old result and show the "too many" card
const showOver = () => {
  validationErrors.value = [];
  unsavedBatch.value = null;
  resultState.value = emptyResultState();
  isOver.value = true;
};

const onCalculateClick = () => {
  resetBatchState();
  saveRecordBatch.value = BATCH_DEFAULT;

  if (entryCount.value > MAX_ENTRIES) {
    showOver();
    return;
  }

  const shouldSaveRecord = runCalculation(moneySnapInput.value) && isLogin.value;
  if (shouldSaveRecord) {
    saveRecordBatch.value += BATCH_OFFSET;
    saveRecord(saveRecordBatch.value);
  }
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

    if (isLogin.value) {
      saveRecordBatch.value += BATCH_OFFSET;
      saveRecord(saveRecordBatch.value);
    }
  }
};

// The pending lines become the new input: too many again → "too many" card, otherwise calculate
const onNextBatchClick = () => {
  const rest = pendingLines.value;

  if (rest.length) {
    resetBatchState();
    moneySnapInput.value = rest.join('\n');
    if (rest.length > MAX_ENTRIES) {
      showOver();
      return;
    }

    if (runCalculation(moneySnapInput.value)) {
      showToast(nextBatchMessage(rest.length));

      if (isLogin.value) {
        saveRecordBatch.value += BATCH_OFFSET;
        saveRecord(saveRecordBatch.value);
      }
    }
  }
};

const onCopyRestClick = async () => {
  const count = extraCount.value;
  const text = entrySplit.value.lines.slice(MAX_ENTRIES).join('\n');
  const copied = await copyText(text);
  gtag('event', AnalyticsEvent.CopyRest, {
    result: copied ? AnalyticsResult.Success : AnalyticsResult.Failed,
    entry_count: count,
  });
  if (!copied) {
    copyBox.value = { title: `複製剩下的 ${formatNumber(count)} 筆`, text };
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

// 匯入 CSV: the hidden file input opens the picker; the file's text goes into the box as if pasted
const csvFileInput = useTemplateRef<HTMLInputElement>('csvFileInput');

const onImportCsvClick = () => {
  csvFileInput.value?.click();
};

const onCsvFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // Clear the pick so choosing the same file again still fires `change`
  input.value = '';
  if (!file) return;

  const result = await readCsvFile(file);
  if (!result.ok) {
    showToast(IMPORT_MESSAGES[result.error]);
    return;
  }
  moneySnapInput.value = result.text;
  validationErrors.value = [];
  resetBatchState();
  gtag('event', AnalyticsEvent.ImportCsv, { entry_count: entryCount.value });
};

const onClearClick = () => {
  moneySnapInput.value = '';
  unsavedBatch.value = null;
  validationErrors.value = [];
  resetBatchState();
  resultState.value = emptyResultState();
};

const onCurrentSettingsClick = async () => {
  await navigateTo({ name: RouteName.Settings });
};

// 登入存檔 (guests): open the 登入 dialog the landing layout renders
const { openModal: openLoginDialog } = useModal(ModalName.Login);
const onLoginSaveClick = () => {
  openLoginDialog();
};
</script>

<style scoped>
@reference "~/assets/css/main.css";

.current-settings {
  @apply text-center;
}
.current-settings ::v-deep(.app-button) {
  @apply rounded-full text-muted bg-bg pl-3 pr-2 py-3 inline-block;
}
.current-settings ::v-deep(.app-button span) {
  @apply rounded-full text-ink bg-surface ml-2 p-2;
}

.result-area {
  @apply flex flex-col gap-4;
}

/* DS: hero-chip row, radius 18 → 16, padding 8px 8px 8px 14px → 8px 8px 8px 16px */
.truncated-notice {
  @apply flex flex-wrap items-center justify-between gap-3 rounded-row bg-hero-chip py-2 pr-2 pl-4;
}
.truncated-notice__text {
  @apply text-helper text-hero-chip-text;
}

.copy-box__hint {
  @apply text-helper text-ink-2;
}
.copy-box__text {
  @apply resize-none;
}
.save-error {
  @apply flex flex-wrap items-center justify-between gap-3;
}
.result-area__actions {
  @apply grid grid-cols-3 gap-2;
}

.money-snap {
  @apply flex flex-col gap-2;
}
.money-snap__notices {
  @apply flex justify-between items-center;
}
/* Opened from 匯入 CSV; display: none keeps it out of the row */
.money-snap__file {
  @apply hidden;
}
.money-snap__errors {
  @apply flex flex-col gap-1;
}

.action-buttons {
  @apply flex grow gap-2;
}
.save-note {
  @apply text-center text-helper text-muted;
}
</style>