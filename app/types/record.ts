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
