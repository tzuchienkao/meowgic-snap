import { InputFormat, RecordRange } from '~/types/record';

export const BATCH_DEFAULT = 0;
export const FIRST_BATCH = 1;
export const BATCH_OFFSET = 1;

/** 紀錄頁: records per page, and at most this many records per 查詢區間 */
export const RECORDS_PAGE_SIZE = 50;
export const RECORDS_MAX_RESULTS = 500;

/** records.name is 1–20 characters (check constraint in the records table) */
export const MAX_RECORD_NAME_LENGTH = 20;

/** 查詢區間 chips, in order */
export const RECORD_RANGE_OPTIONS: readonly { value: RecordRange; label: string }[] = [
  { value: RecordRange.OneMonth, label: '近 1 個月' },
  { value: RecordRange.ThreeMonths, label: '近 3 個月' },
  { value: RecordRange.SixMonths, label: '近半年' },
];
export const DEFAULT_RECORD_RANGE = RecordRange.ThreeMonths;
export const CUSTOM_RANGE_LABEL = '自訂';
/** Records are kept (and readable, RLS) for 2 years; a 查詢區間 spans at most half a year */
export const RECORD_RETENTION_YEARS = 2;
export const MAX_RANGE_MONTHS = 6;

/** 自訂 查詢區間 validation messages */
export const RECORD_DATES_ERRORS = {
  required: '請選開始和結束日期喵',
  order: '開始日期要在結束日期之前喵',
  tooOld: `只能查 ${RECORD_RETENTION_YEARS} 年內的紀錄喵`,
  future: '結束日期不能超過今天喵',
  tooLong: '一次最多查半年喵',
} as const;

/** Query of a 紀錄 page link that opens one record (儀表板 最近幾次兌換) */
export enum LogsQuery {
  Record = 'record',
  CreatedAt = 'at',
}

/** How a record's input format reads on the 紀錄 page */
export const INPUT_FORMAT_LABEL: Record<InputFormat, string> = {
  [InputFormat.NameAndAmount]: '姓名＋金額',
  [InputFormat.AmountOnly]: '純金額',
};
