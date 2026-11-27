import { computed, ref } from 'vue';
import { DEFAULT_RECORD_RANGE, RECORDS_MAX_RESULTS, RECORDS_PAGE_SIZE } from '~/constants/record';
import { InputFormat, RecordRange, type IRecordCounts, type IRecordDetail, type IRecordSummary } from '~/types/record';
import { amountOnlyEntryName, calculateDenominations, DEFAULT_DENOMINATIONS } from '~/utils/moneyParser';

// TODO(supabase): replace the mock with the signed-in member's records (see docs/database.md §4):
// - records / totalCount: summary columns of the records in the 查詢區間, newest first,
//   RECORDS_PAGE_SIZE per page, at most RECORDS_MAX_RESULTS, plus the total count;
// - selectedRecord: the whole record (rows, denomination_counts…) of the selected row;
// - renameRecord: update records.name;
// - listRangeRecords: every record in the 查詢區間 with its denomination counts (no rows).
// Keep the returned names and shapes and the page needs no changes.

const MOCK_RECORD_COUNT = 64;
const MOCK_DAYS_APART = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const MOCK_PEOPLE = ['王小明', '陳美玲', '林志豪', '張雅婷', '李俊傑', '黃淑芬', '吳承恩', '蔡依林', '鄭文華', '許家豪', '周雨萱', '謝明哲'];
const MOCK_TITLES = ['薪資', '工讀費', '獎金', '零用金'];

const buildMockRecords = (): IRecordDetail[] => {
  const newest = new Date('2026-11-20T12:00:00+08:00').getTime();
  return Array.from({ length: MOCK_RECORD_COUNT }, (_, i) => {
    const createdAt = new Date(newest - i * MOCK_DAYS_APART * DAY_MS);
    const inputFormat = i % 5 === 4 ? InputFormat.AmountOnly : InputFormat.NameAndAmount;
    const entryCount = 3 + (i % 10);
    const rows = Array.from({ length: entryCount }, (_, j) => ({
      name: inputFormat === InputFormat.AmountOnly ? amountOnlyEntryName(j + 1) : MOCK_PEOPLE[j % MOCK_PEOPLE.length]!,
      total: 1000 + ((i * 7919 + j * 104729) % 40000),
    }));
    const denominations = [...DEFAULT_DENOMINATIONS];
    const denominationCounts: Record<number, number> = {};
    rows.forEach((row) => {
      Object.entries(calculateDenominations(row.total, denominations).denominations).forEach(([denomination, count]) => {
        denominationCounts[Number(denomination)] = (denominationCounts[Number(denomination)] ?? 0) + count;
      });
    });
    return {
      id: `mock-${i + 1}`,
      name: `${createdAt.getMonth() + 1}月${MOCK_TITLES[i % MOCK_TITLES.length]}`,
      createdAt: createdAt.toISOString(),
      entryCount,
      totalAmount: rows.reduce((sum, row) => sum + row.total, 0),
      inputFormat,
      denominations,
      denominationCounts,
      rows,
    };
  });
};

const toSummary = ({ id, name, createdAt, entryCount, totalAmount }: IRecordDetail): IRecordSummary => ({
  id,
  name,
  createdAt,
  entryCount,
  totalAmount,
});

const toCounts = ({ inputFormat: _inputFormat, rows: _rows, ...counts }: IRecordDetail): IRecordCounts => counts;

/**
 * 紀錄 page data: the records in the 查詢區間, one page at a time; the selected record (the clicked
 * row, or the newest on the page); rename; and the source of 匯出這個區間 CSV.
 */
export const useRecords = () => {
  const range = ref<RecordRange>(DEFAULT_RECORD_RANGE);
  /** 1-based */
  const page = ref(1);
  const allRecords = useState<IRecordDetail[]>('records-mock', buildMockRecords);

  const rangeRecords = computed(() => {
    const since = new Date();
    since.setMonth(since.getMonth() - range.value);
    return allRecords.value.filter((record) => new Date(record.createdAt) >= since).slice(0, RECORDS_MAX_RESULTS);
  });

  /** Records in the 查詢區間 (at most RECORDS_MAX_RESULTS) */
  const totalCount = computed(() => rangeRecords.value.length);
  const pageCount = computed(() => Math.max(1, Math.ceil(totalCount.value / RECORDS_PAGE_SIZE)));
  /** The current page, newest first */
  const records = computed(() =>
    rangeRecords.value.slice((page.value - 1) * RECORDS_PAGE_SIZE, page.value * RECORDS_PAGE_SIZE).map(toSummary),
  );

  /** The clicked row; falls back to the newest on the page when it is not on this page */
  const selectedId = ref<string | null>(null);
  const currentId = computed(
    () => records.value.find((record) => record.id === selectedId.value)?.id ?? records.value[0]?.id ?? null,
  );
  const selectedRecord = computed(() => allRecords.value.find((record) => record.id === currentId.value));

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

  const renameRecord = async (id: string, name: string) => {
    const record = allRecords.value.find((item) => item.id === id);
    if (record) record.name = name;
  };

  const listRangeRecords = async (): Promise<IRecordCounts[]> => rangeRecords.value.map(toCounts);

  return {
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
  };
};
