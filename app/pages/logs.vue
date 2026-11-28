<template>
  <div class="page-logs flex flex-col gap-5">
    <app-page-header title="紀錄" description="每一次兌換都幫你記下來了，紀錄保存 2 年">
      <template #actions>
        <app-button
          variant="surface"
          size="md"
          icon="↓"
          label="匯出這個區間 CSV"
          :disabled="!totalCount || hasListError || isExportingRange"
          @click="onExportRangeClick"
        />
      </template>
    </app-page-header>

    <!-- 查詢區間 -->
    <app-card radius="sub" class="range-card">
      <div class="range-card__chips">
        <span class="range-card__label">查詢區間</span>
        <app-filter-chip
          v-for="option in RECORD_RANGE_OPTIONS"
          :key="option.value"
          :label="option.label"
          :pressed="!isCustomOpen && option.value === range"
          @click="onRangeClick(option.value)"
        />
        <app-filter-chip :label="CUSTOM_RANGE_LABEL" :pressed="isCustomOpen" @click="onCustomRangeClick" />
        <!-- 自訂 on desktop: the DS DatePicker right after the chip (as tall as it); 套用 queries.
             Mobile: the native date inputs below (the phone's own picker), then 查詢 -->
        <app-date-picker
          v-if="isCustomOpen"
          class="custom-range__picker"
          size="sm"
          aria-label="自訂查詢區間"
          :model-value="{ start: customStart, end: customEnd }"
          :min="dateLimits.min"
          :max="dateLimits.max"
          :max-span-months="MAX_RANGE_MONTHS"
          :invalid="!!customError"
          @update:model-value="onCustomRangePick"
        />
        <!-- Slides to the pressed chip, like NavPills -->
        <span class="range-card__indicator" aria-hidden="true" />
      </div>
      <p v-if="isCustomOpen && customError" class="custom-range__error custom-range__error--desktop" role="alert">
        {{ customError }}
      </p>
      <form v-if="isCustomOpen" class="custom-range" novalidate @submit.prevent="onCustomRangeSubmit">
        <div class="custom-range__fields">
          <app-input
            v-model="customStart"
            class="custom-range__field"
            type="date"
            label="開始日期"
            :min="dateLimits.min"
            :max="dateLimits.max"
            :invalid="!!customError"
          />
          <app-input
            v-model="customEnd"
            class="custom-range__field"
            type="date"
            label="結束日期"
            :min="dateLimits.min"
            :max="dateLimits.max"
            :invalid="!!customError"
          />
          <app-button variant="primary" size="md" label="查詢" class="custom-range__submit" @click="onCustomRangeSubmit" />
        </div>
        <p v-if="customError" class="custom-range__error" role="alert">{{ customError }}</p>
      </form>
      <p class="range-card__hint">
        紀錄保存 2 年 · 一次最多查半年 · 最多顯示 {{ RECORDS_MAX_RESULTS }} 筆 · 每頁 {{ RECORDS_PAGE_SIZE }} 筆
      </p>
      <p class="range-card__hint">這不是會計憑證，需要留存請匯出 CSV 自行保存</p>
    </app-card>

    <!-- Nothing in the 查詢區間, or the list could not be loaded -->
    <app-cat-ear-card v-if="hasListError || !records.length" class="page-logs__loadable" :aria-busy="isListLoading">
      <app-empty-state :message="hasListError ? LIST_ERROR_MESSAGE : EMPTY_MESSAGE">
        <img src="~/assets/images/cats-open-book.svg" alt="貓咪插畫：翻開空白的紀錄本" class="h-30">
        <template #actions>
          <app-button v-if="hasListError" variant="primary" size="md" label="重試" @click="onListRetryClick" />
        </template>
      </app-empty-state>
    </app-cat-ear-card>

    <!-- DS: list 380px + detail beside it (desktop: breakpoint, 900px). Desktop: at most one screen tall,
         the list scrolls inside. Mobile: one column, the selected row becomes a RecordDetailCard -->
    <div v-else class="page-logs__body">
      <div :ref="onListRef" class="records-list page-logs__loadable" :aria-busy="isListLoading">
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
                  :class="{ 'records-list__row--desktop-only': record.id === shownRecord?.id }"
                  :name="record.name"
                  :date="formatDate(record.createdAt)"
                  :meta="`${record.entryCount} 筆`"
                  :amount="formatNumber(record.totalAmount)"
                  :selected="record.id === currentId"
                  @click="onRecordClick(record.id)"
                />
                <!-- Mobile: the selected row, its total and cash in one cat-ear card -->
                <app-record-detail-card
                  v-if="shownRecord && record.id === shownRecord.id"
                  class="records-list__detail-card page-logs__loadable"
                  :aria-busy="isDetailLoading"
                  :name="shownRecord.name"
                  :date="formatDate(shownRecord.createdAt)"
                  :count="shownRecord.entryCount"
                  :format="INPUT_FORMAT_LABEL[shownRecord.inputFormat]"
                  :amount="formatNumber(shownRecord.totalAmount)"
                  :breakdown="selectedCash"
                  :open="!isInlineCollapsed"
                  @toggle="onRecordClick(record.id)"
                  @rename="onRenameClick"
                  @export="onExportRecordClick"
                />
                <app-card
                  v-else-if="hasDetailError && record.id === currentId"
                  radius="sub"
                  class="detail-error records-list__detail-error"
                >
                  <p class="detail-error__text">{{ DETAIL_ERROR_MESSAGE }}</p>
                  <app-button variant="primary" size="sm" label="重試" @click="onDetailRetryClick" />
                </app-card>
              </li>
            </ul>
          </section>
          <!-- Desktop: slides to the selected row, like NavPills -->
          <span
            class="records-list__indicator"
            :class="{ 'records-list__indicator--sliding': isRowSliding }"
            aria-hidden="true"
          />
        </div>
        <app-pagination
          class="records-list__pagination"
          :page="page"
          :pages="pageCount"
          :caption="pageCaption"
          @change="onPageChange"
        />
      </div>

      <app-card v-if="hasDetailError" class="detail-error page-logs__side">
        <p class="detail-error__text">{{ DETAIL_ERROR_MESSAGE }}</p>
        <app-button variant="primary" size="md" label="重試" @click="onDetailRetryClick" />
      </app-card>
      <record-detail
        v-else-if="shownRecord"
        class="page-logs__side page-logs__loadable"
        :aria-busy="isDetailLoading"
        :record="shownRecord"
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
import { DESKTOP_MEDIA_QUERY } from '~/constants/breakpoints';
import { formatDate, formatNumber } from '~/utils/format';
import { toDenominationItems } from '~/utils/denominations';
import { computed, nextTick, ref } from 'vue';
import { AnalyticsEvent, AnalyticsResult } from '~/constants/analytics';
import {
  CUSTOM_RANGE_LABEL,
  INPUT_FORMAT_LABEL,
  LogsQuery,
  MAX_RANGE_MONTHS,
  MAX_RECORD_NAME_LENGTH,
  RECORD_RANGE_OPTIONS,
  RECORDS_MAX_RESULTS,
  RECORDS_PAGE_SIZE,
} from '~/constants/record';
import type { IDateRange } from '~/components/app/DatePicker/IDatePicker';
import { useRecords } from '~/composables/useRecords';
import { useRecordDetail } from '~/composables/useRecordDetail';
import type { ILinkedRecord, RecordRange } from '~/types/record';
import { createCsvBlob, downloadBlob } from '~/utils/download';
import { periodFromRange, recordDatesLimits, validateRecordDates } from '~/utils/recordPeriod';
import { toDayKey } from '~/utils/calendar';
import { buildExportFileName, buildRecordCsv, buildRecordsCsv, EXPORT_RECORDS_FILE_PREFIX, ExportExt } from '~/utils/exporters';
import { updateRecordName } from '~/utils/records';

const EMPTY_MESSAGE = '這段期間沒有兌換紀錄喵';
const LIST_ERROR_MESSAGE = '資料沒有載入成功喵';
const DETAIL_ERROR_MESSAGE = '這筆紀錄沒有載入成功喵';
/** useAsyncData's status while it fetches */
enum AsyncDataStatus {
  Pending = 'pending',
}
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
const route = useRoute();

/** ?record=…&at=… (儀表板 最近幾次兌換): open on that record */
const linkedRecord = computed<ILinkedRecord | null>(() => {
  const id = route.query[LogsQuery.Record];
  const createdAt = route.query[LogsQuery.CreatedAt];
  return typeof id === 'string' && typeof createdAt === 'string' && !Number.isNaN(Date.parse(createdAt))
    ? { id, createdAt }
    : null;
});

const {
  range,
  customDates,
  setCustomDates,
  page,
  records,
  totalCount,
  pageCount,
  currentId,
  setRange,
  setPage,
  selectRecord,
  listRangeRecords,
  status: listStatus,
  error: listError,
  refresh: refreshList,
} = await useRecords(linkedRecord.value);
const {
  selectedRecord,
  status: detailStatus,
  error: detailError,
  refresh: refreshDetail,
} = await useRecordDetail(currentId);

// Loading (a new range / page / record keeps the old one, dimmed, until it arrives) and load failures
const isListLoading = computed(() => listStatus.value === AsyncDataStatus.Pending);
const hasListError = computed(() => !!listError.value);
const isDetailLoading = computed(() => detailStatus.value === AsyncDataStatus.Pending);
const hasDetailError = computed(() => !!detailError.value);
/** The record the detail shows: none when it could not be loaded */
const shownRecord = computed(() => (hasDetailError.value ? undefined : selectedRecord.value));

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
const selectedCash = computed(() => toDenominationItems(selectedRecord.value?.denominationCounts ?? {}));

/** The selected fill slides only when a row is clicked; a new range / page shows its first row at once */
const isRowSliding = ref(false);

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
// From the desktop breakpoint the list and the detail sit side by side
const isDesktop = () => window.matchMedia(DESKTOP_MEDIA_QUERY).matches;

/** New records in the list: start from its top (inside the list on desktop, the page on mobile) */
const scrollListToTop = () => {
  if (scrollElement) scrollElement.scrollTop = 0;
  if (!isDesktop()) listElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// 自訂 查詢區間
const isCustomOpen = ref(!!customDates.value);
const customStart = ref(customDates.value?.start ?? '');
const customEnd = ref(customDates.value?.end ?? '');
const customError = ref('');
const dateLimits = computed(() => recordDatesLimits());

const onCustomRangeClick = () => {
  if (isCustomOpen.value) return;
  isCustomOpen.value = true;
  customError.value = '';
  // Start from the 近 N 個月 shown now
  customStart.value = toDayKey(new Date(periodFromRange(range.value).from));
  customEnd.value = dateLimits.value.max;
};

const onCustomRangeSubmit = () => {
  const dates = { start: customStart.value, end: customEnd.value };
  customError.value = validateRecordDates(dates);
  if (customError.value) return;
  isRowSliding.value = false;
  setCustomDates(dates);
  isInlineCollapsed.value = false;
  if (scrollElement) scrollElement.scrollTop = 0;
};

/** Desktop DatePicker 套用 */
const onCustomRangePick = ({ start, end }: IDateRange) => {
  customStart.value = start;
  customEnd.value = end;
  onCustomRangeSubmit();
};

const onRangeClick = (value: RecordRange) => {
  isRowSliding.value = false;
  isCustomOpen.value = false;
  setRange(value);
  isInlineCollapsed.value = false;
  if (scrollElement) scrollElement.scrollTop = 0;
};

const onPageChange = (value: number) => {
  isRowSliding.value = false;
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
  isRowSliding.value = true;
  if (isDesktop()) {
    selectRecord(id);
    return;
  }
  if (id === currentId.value) {
    isInlineCollapsed.value = !isInlineCollapsed.value;
    return;
  }
  selectRecord(id);
  isInlineCollapsed.value = false;
  // The card that was open above may have folded into a row and moved this one up: keep the new card in view
  await nextTick();
  listElement?.querySelector(`[data-record-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

const onListRetryClick = () => {
  refreshList();
};
const onDetailRetryClick = () => {
  refreshDetail();
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
    await updateRecordName(selectedRecord.value.id, renameValue.value.trim());
    await Promise.all([refreshList(), refreshDetail()]);
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

/* Sliding pill behind the pressed chip (as NavPills). With anchor positioning the pressed chip itself
   turns transparent and the pill paints it; the chips' labels sit above the pill */
/* isolate: the label / pill z-index stays inside the chips (the mobile ☰ menu goes over them) */
.range-card__chips {
  @apply relative isolate;
}
.range-card__chips :deep(.app-filter-chip__label) {
  @apply relative z-2;
}
.range-card__indicator {
  @apply absolute z-1 rounded-full bg-nav-active;
  position-anchor: --range-chip-pressed;
  top: anchor(top);
  bottom: anchor(bottom);
  left: anchor(left);
  right: anchor(right);
  transition:
    top 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    bottom 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    left 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    right 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.range-card__chips :deep(.app-filter-chip--pressed) {
  anchor-name: --range-chip-pressed;
}
@supports (anchor-name: --a) {
  .range-card__chips :deep(.app-filter-chip--pressed) {
    @apply bg-transparent;
  }
}

/* 自訂: two date fields and 查詢 in a row (stacked on narrow screens) */
.custom-range__picker {
  @apply hidden w-80 desktop:flex;
}
.custom-range {
  @apply flex flex-col gap-2 desktop:hidden;
}
.custom-range__fields {
  @apply flex flex-wrap items-end gap-3;
}
.custom-range__field {
  @apply min-w-40 flex-1;
}
.custom-range__error {
  @apply text-helper text-warn-text;
}
.custom-range__error--desktop {
  @apply hidden desktop:block;
}

/* While a new range / page / record loads, the old one stays dimmed (and can't be clicked) */
.page-logs__loadable {
  @apply transition-opacity duration-200;
}
.page-logs__loadable[aria-busy='true'] {
  @apply pointer-events-none opacity-60;
}

.detail-error {
  @apply items-center gap-3 text-center;
}
.detail-error__text {
  @apply text-ink;
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
  /* isolate: the rows' / pill's z-index stays inside the list */
  @apply relative isolate desktop:min-h-0 desktop:flex-1 desktop:overflow-y-auto;
}
/* Desktop: the selected (strong) fill slides between rows, like NavPills. The pill sits above the rows'
   own fills and below their text; with anchor positioning the selected row itself turns transparent */
.records-list__row > :deep(*) {
  @apply relative z-2;
}
.records-list__row.app-record-row--selected {
  anchor-name: --records-row-selected;
}
.records-list__indicator {
  @apply absolute z-1 hidden rounded-3xl bg-strong desktop:block;
  position-anchor: --records-row-selected;
  position-visibility: anchors-visible;
  top: anchor(top);
  bottom: anchor(bottom);
  left: anchor(left);
  right: anchor(right);
}
.records-list__indicator--sliding {
  transition:
    top 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    bottom 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
@supports (anchor-name: --a) {
  .records-list__row.app-record-row--selected {
    @apply desktop:bg-transparent;
  }
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
.records-list__detail-card,
.records-list__detail-error {
  @apply my-2 desktop:hidden;
}
.page-logs__side {
  @apply hidden desktop:flex;
}

.rename-dialog__actions {
  @apply flex flex-col gap-2;
}
</style>
