/**
 * GA4 custom event names (sent with nuxt-gtag). Only send counts and outcomes as parameters:
 * never the names or amounts users paste.
 */
export enum AnalyticsEvent {
  CopySlip = 'copy_slip',
  DownloadImage = 'download_image',
  ExportCsv = 'export_csv',
  /** 首頁 匯入 CSV: entry_count is the number of lines read in */
  ImportCsv = 'import_csv',
  /** 複製第 1,001 筆之後的 N 筆: entry_count is the number of lines copied */
  CopyRest = 'copy_rest',
  /** 紀錄頁 匯出這筆 CSV: entry_count is the record's 筆數 */
  ExportRecordCsv = 'export_record_csv',
  /** 紀錄頁 匯出這個區間 CSV: record_count is the number of records exported */
  ExportRangeCsv = 'export_range_csv',
}

/** Value of the `result` parameter on export events. */
export enum AnalyticsResult {
  Success = 'success',
  Failed = 'failed',
}
