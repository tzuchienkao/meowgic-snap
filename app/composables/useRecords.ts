import { computed, ref } from 'vue';
import { DEFAULT_RECORD_RANGE, RECORDS_PAGE_SIZE } from '~/constants/record';
import type { ILinkedRecord, IRecordDates, RecordRange } from '~/types/record';
import { periodFromDates, periodFromRange, rangeForRecord } from '~/utils/recordPeriod';
import { fetchRecordList, fetchRangeRecords } from '~/utils/records';

/**
 * 紀錄 page list: the records in the 查詢區間, one page at a time; which row is selected
 * (currentId: the clicked row, or the newest on the page); and the source of 匯出這個區間 CSV.
 */
export const useRecords = async (linked: ILinkedRecord | null = null) => {
  // A linked record (儀表板 最近幾次兌換) starts with a 查詢區間 that shows it, and selected
  const initial = linked ? rangeForRecord(linked.createdAt) : null;
  /** 近 N 個月; used while customDates is null */
  const range = ref<RecordRange>(initial?.range ?? DEFAULT_RECORD_RANGE);
  /** 自訂 查詢區間 (both days included), or null for 近 N 個月 */
  const customDates = ref<IRecordDates | null>(initial?.dates ?? null);
  const period = computed(() => (customDates.value ? periodFromDates(customDates.value) : periodFromRange(range.value)));
  /** 1-based */
  const page = ref(1);

  // 列表：range 或 page 改變時自動重抓
  const listRequest = await useAsyncData(
    'records-list',
    () => fetchRecordList(period.value, page.value),
    { watch: [period, page] },
  );
  const { data: list, status, error, refresh: refreshList } = listRequest;
  /** Records in the 查詢區間 (at most RECORDS_MAX_RESULTS) */
  const totalCount = computed(() => list.value?.totalCount ?? 0);
  const pageCount = computed(() => Math.max(1, Math.ceil(totalCount.value / RECORDS_PAGE_SIZE)));
  const records = computed(() => list.value?.records ?? []);

  const selectedId = ref<string | null>(linked?.id ?? null);
  const currentId = computed(() => records.value.find((r) => r.id === selectedId.value)?.id ?? records.value[0]?.id ?? null);

  const setRange = (value: RecordRange) => {
    range.value = value;
    customDates.value = null;
    page.value = 1;
    selectedId.value = null;
  };
  const setCustomDates = (value: IRecordDates) => {
    customDates.value = value;
    page.value = 1;
    selectedId.value = null;
  };
  const setPage = (value: number) => {
    page.value = value;
    selectedId.value = null;
  };
  const selectRecord = (id: string) => {
    selectedId.value = id;
  };

  const listRangeRecords = () => fetchRangeRecords(period.value);

  return {
    range,
    customDates,
    period,
    page,
    records,
    totalCount,
    pageCount,
    currentId,
    setRange,
    setCustomDates,
    setPage,
    selectRecord,
    listRangeRecords,
    status,               // AsyncDataStatus (constants/asyncData.ts)
    error,                // 失敗時是錯誤物件，成功時是 undefined
    refresh: refreshList,
  };
};
