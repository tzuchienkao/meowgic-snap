<template>
  <div class="page-settings flex flex-col gap-5">
    <div class="page-logs__header">
      <div class="page-settings__header">
        <h1 class="text-ink text-h1">紀錄</h1>
        <p class="text-muted text-helper mt-1">每一次兌換都幫你記下來了，紀錄保存 2 年</p>
      </div>
      <app-button
        variant="surface"
        size="md"
        icon="↓"
        label="匯出這個區間 CSV"
        :disabled="!totalCount || isExportingRange"
        @click="onExportRangeClick"
      />
    </div>

    <!-- 查詢區間 -->
    <app-card radius="sub" class="range-card">
      <div class="range-card__chips">
        <span class="range-card__label">查詢區間</span>
        <app-filter-chip
          v-for="option in RECORD_RANGE_OPTIONS"
          :key="option.value"
          :label="option.label"
          :pressed="option.value === range"
          @click="onRangeClick(option.value)"
        />
      </div>
      <p class="range-card__hint">
        紀錄保存 2 年 · 一次最多查半年 · 最多顯示 {{ RECORDS_MAX_RESULTS }} 筆 · 每頁 {{ RECORDS_PAGE_SIZE }} 筆
      </p>
      <p class="range-card__hint">這不是會計憑證，需要留存請匯出 CSV 自行保存</p>
    </app-card>

    <!-- Nothing in the 查詢區間 -->
    <app-cat-ear-card v-if="!records.length">
      <app-illustration-slot class="logs-empty" label="貓咪插畫：翻開空白的紀錄本" radius="card" :stripe="10">
        <p class="logs-empty__text">{{ EMPTY_MESSAGE }}</p>
      </app-illustration-slot>
    </app-cat-ear-card>

    <!-- DS: list 380px + detail beside it (desktop: breakpoint, 900px). Desktop: at most one screen tall,
         the list scrolls inside. Mobile: one column, the selected row becomes a RecordDetailCard -->
    <div v-else class="page-logs__body">
      <div :ref="onListRef" class="records-list">
        <div :ref="onScrollRef" class="records-list__scroll">
          <section v-for="group in yearGroups" :key="group.year" class="records-list__group">
            <button
              type="button"
              class="records-list__year"
              :aria-expanded="!collapsedYears.includes(group.year)"
              @click="onYearClick(group.year)"
            >
              {{ group.year }} 年
              <span class="records-list__year-count">
                {{ group.records.length }} 筆 {{ collapsedYears.includes(group.year) ? '▼' : '▲' }}
              </span>
            </button>
            <ul v-show="!collapsedYears.includes(group.year)" class="records-list__rows">
              <li v-for="record in group.records" :key="record.id" class="records-list__item" :data-record-id="record.id">
                <app-record-row
                  class="records-list__row"
                  :class="{ 'records-list__row--desktop-only': record.id === selectedRecord?.id }"
                  :name="record.name"
                  :date="formatDate(record.createdAt)"
                  :meta="`${record.entryCount} 筆`"
                  :amount="formatNumber(record.totalAmount)"
                  :selected="record.id === selectedRecord?.id"
                  @click="onRecordClick(record.id)"
                />
                <!-- Mobile: the selected row, its total and cash in one cat-ear card -->
                <app-record-detail-card
                  v-if="selectedRecord && record.id === selectedRecord.id"
                  class="records-list__detail-card"
                  :name="selectedRecord.name"
                  :date="formatDate(selectedRecord.createdAt)"
                  :count="selectedRecord.entryCount"
                  :format="INPUT_FORMAT_LABEL[selectedRecord.inputFormat]"
                  :amount="formatNumber(selectedRecord.totalAmount)"
                  :breakdown="selectedCash"
                  :open="!isInlineCollapsed"
                  @toggle="onRecordClick(record.id)"
                  @rename="onRenameClick"
                  @export="onExportRecordClick"
                />
              </li>
            </ul>
          </section>
        </div>
        <app-pagination
          class="records-list__pagination"
          :page="page"
          :pages="pageCount"
          :caption="pageCaption"
          @change="onPageChange"
        />
      </div>

      <record-detail
        v-if="selectedRecord"
        class="page-logs__side"
        :record="selectedRecord"
        @rename="onRenameClick"
        @export="onExportRecordClick"
      />
    </div>

    <!-- 改名 -->
    <app-dialog :open="isRenameOpen" title="幫這筆紀錄改名" @close="isRenameOpen = false">
      <app-input
        label="紀錄名稱"
        :model-value="renameValue"
        :invalid="!!renameError"
        :hint="renameError"
        :count="`${renameValue.length} / ${MAX_RECORD_NAME_LENGTH}`"
        @update:model-value="onRenameInput"
      />
      <div class="rename-dialog__actions">
        <app-button full label="儲存" :disabled="!canSaveName || isRenaming" @click="onRenameSaveClick" />
        <app-button variant="secondary" full label="先不要" @click="isRenameOpen = false" />
      </div>
    </app-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { AnalyticsEvent, AnalyticsResult } from '~/constants/analytics';
import {
  INPUT_FORMAT_LABEL,
  MAX_RECORD_NAME_LENGTH,
  RECORD_RANGE_OPTIONS,
  RECORDS_MAX_RESULTS,
  RECORDS_PAGE_SIZE,
} from '~/constants/record';
import { useRecords } from '~/composables/useRecords';
import type { RecordRange } from '~/types/record';
import { createCsvBlob, downloadBlob } from '~/utils/download';
import { buildExportFileName, buildRecordCsv, buildRecordsCsv, EXPORT_RECORDS_FILE_PREFIX, ExportExt } from '~/utils/exporters';

const EMPTY_MESSAGE = '這段期間沒有兌換紀錄喵';
/** Same as --breakpoint-desktop: from here the list and the detail sit side by side */
const DESKTOP_MEDIA_QUERY = '(min-width: 900px)';
const MESSAGES = {
  csvDone: 'CSV 匯出好了喵',
  csvFailed: 'CSV 沒有匯出成功喵',
  renameDone: '名稱改好了喵',
  renameFailed: '名稱沒有改成功喵，再試一次看看',
  nameRequired: '名稱不能空白喵',
  nameTooLong: `最多 ${MAX_RECORD_NAME_LENGTH} 個字`,
} as const;

const { showToast } = useToast();
const { gtag } = useGtag();
const {
  range,
  page,
  records,
  totalCount,
  pageCount,
  selectedRecord,
  setRange,
  setPage,
  selectRecord,
  renameRecord,
  listRangeRecords,
} = useRecords();

const formatNumber = (value: number) => value.toLocaleString('en-US');
const pad2 = (value: number) => String(value).padStart(2, '0');
/** ISO → "2026/10/17" (local time) */
const formatDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
};

// List: the current page grouped by year (a 查詢區間 can cross New Year); a year can be folded
const yearGroups = computed(() => {
  const groups: { year: number; records: typeof records.value }[] = [];
  records.value.forEach((record) => {
    const year = new Date(record.createdAt).getFullYear();
    const group = groups.find((item) => item.year === year);
    if (group) group.records.push(record);
    else groups.push({ year, records: [record] });
  });
  return groups;
});
const collapsedYears = ref<number[]>([]);

const pageCaption = computed(() => {
  const first = (page.value - 1) * RECORDS_PAGE_SIZE + 1;
  const last = Math.min(page.value * RECORDS_PAGE_SIZE, totalCount.value);
  return `第 ${first}–${last} 筆，共 ${totalCount.value} 筆`;
});

/** 這次要準備的現金 of the selected record: non-zero counts, large → small */
const selectedCash = computed(() =>
  Object.entries(selectedRecord.value?.denominationCounts ?? {})
    .map(([denomination, count]) => ({ denomination: Number(denomination), count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.denomination - a.denomination),
);

// Mobile: the selected record is an open RecordDetailCard; tapping its head again folds it
const isInlineCollapsed = ref(false);

let listElement: HTMLElement | null = null;
let scrollElement: HTMLElement | null = null;
const onListRef = (el: unknown) => {
  listElement = el as HTMLElement | null;
};
const onScrollRef = (el: unknown) => {
  scrollElement = el as HTMLElement | null;
};
const isDesktop = () => window.matchMedia(DESKTOP_MEDIA_QUERY).matches;

/** New records in the list: start from its top (inside the list on desktop, the page on mobile) */
const scrollListToTop = () => {
  if (scrollElement) scrollElement.scrollTop = 0;
  if (!isDesktop()) listElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const onRangeClick = (value: RecordRange) => {
  setRange(value);
  isInlineCollapsed.value = false;
  if (scrollElement) scrollElement.scrollTop = 0;
};

const onPageChange = (value: number) => {
  setPage(value);
  isInlineCollapsed.value = false;
  scrollListToTop();
};

const onYearClick = (year: number) => {
  collapsedYears.value = collapsedYears.value.includes(year)
    ? collapsedYears.value.filter((item) => item !== year)
    : [...collapsedYears.value, year];
};

const onRecordClick = async (id: string) => {
  if (isDesktop()) {
    selectRecord(id);
    return;
  }
  if (id === selectedRecord.value?.id) {
    isInlineCollapsed.value = !isInlineCollapsed.value;
    return;
  }
  selectRecord(id);
  isInlineCollapsed.value = false;
  // The card that was open above may have folded into a row and moved this one up: keep the new card in view
  await nextTick();
  listElement?.querySelector(`[data-record-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// 改名
const isRenameOpen = ref(false);
const isRenaming = ref(false);
const renameValue = ref('');
const renameError = computed(() => {
  const name = renameValue.value.trim();
  if (!name) return MESSAGES.nameRequired;
  if (name.length > MAX_RECORD_NAME_LENGTH) return MESSAGES.nameTooLong;
  return '';
});
const canSaveName = computed(() => !renameError.value && renameValue.value.trim() !== selectedRecord.value?.name);

const onRenameClick = () => {
  renameValue.value = selectedRecord.value?.name ?? '';
  isRenameOpen.value = true;
};

const onRenameInput = (value: string) => {
  renameValue.value = value;
};

const onRenameSaveClick = async () => {
  if (!selectedRecord.value || !canSaveName.value) return;
  isRenaming.value = true;
  try {
    await renameRecord(selectedRecord.value.id, renameValue.value.trim());
    isRenameOpen.value = false;
    showToast(MESSAGES.renameDone);
  } catch (error) {
    console.error('Failed to rename record:', error);
    showToast(MESSAGES.renameFailed);
  } finally {
    isRenaming.value = false;
  }
};

// CSV
const onExportRecordClick = () => {
  const record = selectedRecord.value;
  if (!record) return;
  try {
    downloadBlob(createCsvBlob(buildRecordCsv(record)), buildExportFileName(ExportExt.Csv, new Date(record.createdAt)));
    gtag('event', AnalyticsEvent.ExportRecordCsv, { result: AnalyticsResult.Success, entry_count: record.entryCount });
    showToast(MESSAGES.csvDone);
  } catch {
    gtag('event', AnalyticsEvent.ExportRecordCsv, { result: AnalyticsResult.Failed, entry_count: record.entryCount });
    showToast(MESSAGES.csvFailed);
  }
};

const isExportingRange = ref(false);
const onExportRangeClick = async () => {
  isExportingRange.value = true;
  try {
    const rangeRecords = await listRangeRecords();
    downloadBlob(
      createCsvBlob(buildRecordsCsv(rangeRecords)),
      buildExportFileName(ExportExt.Csv, new Date(), EXPORT_RECORDS_FILE_PREFIX),
    );
    gtag('event', AnalyticsEvent.ExportRangeCsv, { result: AnalyticsResult.Success, record_count: rangeRecords.length });
    showToast(MESSAGES.csvDone);
  } catch (error) {
    console.error('Failed to export records:', error);
    gtag('event', AnalyticsEvent.ExportRangeCsv, { result: AnalyticsResult.Failed, record_count: totalCount.value });
    showToast(MESSAGES.csvFailed);
  } finally {
    isExportingRange.value = false;
  }
};
</script>

<style scoped>
@reference "~/assets/css/main.css";

.page-logs__header {
  @apply flex flex-wrap items-end justify-between gap-3;
}

/* DS padding 16/18, gap 12 → 16 / 12 */
.range-card {
  @apply gap-3 p-4;
}
.range-card__chips {
  @apply flex flex-wrap items-center gap-2;
}
.range-card__label {
  @apply mr-1 text-btn text-ink;
}
.range-card__hint {
  @apply text-helper text-muted;
}

.logs-empty {
  @apply p-6 min-h-70;
}
.logs-empty__text {
  @apply text-lg;
}

.page-logs__body {
  @apply grid grid-cols-1 items-start gap-5 desktop:grid-cols-[minmax(0,380px)_minmax(0,1fr)];
}

.records-list,
.records-list__scroll,
.records-list__group,
.records-list__rows {
  @apply flex flex-col gap-2;
}
/* Desktop: the list (the body's tall column) is at most one screen tall; the rows scroll inside and
   the pagination stays below them */
.records-list {
  @apply desktop:max-h-dvh;
}
.records-list__scroll {
  @apply desktop:min-h-0 desktop:flex-1 desktop:overflow-y-auto;
}
/* DS year row 40px tall: 8px padding + 24px line */
.records-list__year {
  @apply flex items-center justify-between px-3 py-2 text-btn leading-6 text-ink cursor-pointer;
}
.records-list__year-count {
  @apply text-helper text-muted;
}
/* On the cream page the rows are white (DS); selected stays strong. DS radius 22 → 24 */
.records-list__row {
  @apply rounded-3xl;
}
.records-list__row:not(.app-record-row--selected) {
  @apply bg-surface;
}
.records-list__pagination {
  @apply pt-1;
}

/* Mobile: the selected row is replaced by its RecordDetailCard (8px extra space above and below, DS);
   desktop: the row stays and the detail sits beside the list */
.records-list__row--desktop-only {
  @apply hidden desktop:flex;
}
.records-list__detail-card {
  @apply my-2 desktop:hidden;
}
.page-logs__side {
  @apply hidden desktop:flex;
}

.rename-dialog__actions {
  @apply flex flex-col gap-2;
}
</style>
