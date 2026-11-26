/** Total exchanged in one calendar month. */
export interface IMonthlyTotal {
  /** 'YYYY-MM', e.g. '2026-06' */
  month: string;
  /** NT$ total for the month (0 when nothing was exchanged) */
  total: number;
}

/** Accumulated count of one denomination across all exchanges. */
export interface IDenominationTotal {
  denomination: number;
  count: number;
}

/** One past exchange shown in 最近幾次兌換. */
export interface IRecentRecord {
  id: string;
  name: string;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** Number of entries (筆) in the exchange */
  entryCount: number;
  /** NT$ total of the exchange */
  totalAmount: number;
}

/** Everything the 儀表板 page needs, as raw data (the page formats it). */
export interface IDashboardData {
  /** NT$ total across all exchanges */
  totalAmount: number;
  /** ISO 8601 date the accumulation started */
  startedAt: string;
  /** Oldest → newest, one per month (the chart shows them all) */
  monthlyTotals: IMonthlyTotal[];
  denominationTotals: IDenominationTotal[];
  /** Newest first */
  recentRecords: IRecentRecord[];
}
