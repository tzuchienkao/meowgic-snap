export enum InputFormat {
  NameAndAmount = 'name_amount',
  AmountOnly = 'amount',
}

/** What the page hands to insertRecord (camelCase; utils/records.ts maps it to the table's snake_case) */
export interface INewRecord {
  name: string;
  inputFormat: InputFormat;
  entryCount: number;
  totalAmount: number;
  denominations: number[];
  denominationCounts: Record<number, number>;
  rows: { name: string; total: number }[];
}
/** 紀錄頁 查詢區間, in months */
export enum RecordRange {
  OneMonth = 1,
  ThreeMonths = 3,
  SixMonths = 6,
}

/** The 查詢區間 as created_at bounds (ISO 8601): from (inclusive) … to (exclusive; none = up to now) */
export interface IRecordPeriod {
  from: string;
  to?: string;
}

/** A 自訂 查詢區間 as picked in the date inputs: YYYY-MM-DD, both days included (local time) */
export interface IRecordDates {
  start: string;
  end: string;
}

/** A record to open on the 紀錄 page (from 儀表板 最近幾次兌換): its id and created_at */
export interface ILinkedRecord {
  id: string;
  createdAt: string;
}

/** One row of the 紀錄 list (camelCase of the records table, without the heavy columns) */
export interface IRecordSummary {
  id: string;
  name: string;
  /** ISO 8601 timestamp */
  createdAt: string;
  entryCount: number;
  totalAmount: number;
}

/** One record in 匯出這個區間 CSV: the list row plus its denomination counts (no rows) */
export interface IRecordCounts extends IRecordSummary {
  denominations: number[];
  denominationCounts: Record<number, number>;
}

/** A whole record, for the detail panel and 匯出這筆 CSV */
export interface IRecordDetail extends IRecordCounts {
  inputFormat: InputFormat;
  rows: { name: string; total: number }[];
}
