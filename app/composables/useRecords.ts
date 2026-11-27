import { computed, ref } from 'vue';
import { DEFAULT_RECORD_RANGE, RECORDS_PAGE_SIZE } from '~/constants/record';
import type { RecordRange } from '~/types/record';
import { fetchRecordList, fetchRangeRecords } from '~/utils/records';

/**
 * 紀錄 page list: the records in the 查詢區間, one page at a time; which row is selected
 * (currentId: the clicked row, or the newest on the page); and the source of 匯出這個區間 CSV.
 */
export const useRecords = async () => {
  const range = ref<RecordRange>(DEFAULT_RECORD_RANGE);
  /** 1-based */
  const page = ref(1);

  // 列表：range 或 page 改變時自動重抓
  const listRequest = await useAsyncData(
    'records-list',
    () => fetchRecordList(range.value, page.value),
    { watch: [range, page] },
  );
  const { data: list, status, error, refresh: refreshList } = listRequest;
  /** Records in the 查詢區間 (at most RECORDS_MAX_RESULTS) */
  const totalCount = computed(() => list.value?.totalCount ?? 0);
  const pageCount = computed(() => Math.max(1, Math.ceil(totalCount.value / RECORDS_PAGE_SIZE)));
  const records = computed(() => list.value?.records ?? []);

  const selectedId = ref<string | null>(null);
  const currentId = computed(() => records.value.find((r) => r.id === selectedId.value)?.id ?? records.value[0]?.id ?? null);

  const setRange = (value: RecordRange) => {
    range.value = value;
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

  const listRangeRecords = () => fetchRangeRecords(range.value);

  return {
    range,
    page,
    records,
    totalCount,
    pageCount,
    currentId,
    setRange,
    setPage,
    selectRecord,
    listRangeRecords,
    status,               // 'idle' | 'pending' | 'success' | 'error'
    error,                // 失敗時是錯誤物件，成功時是 undefined
    refresh: refreshList,
  };
};
