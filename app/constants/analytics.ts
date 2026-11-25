/**
 * GA4 custom event names (sent with nuxt-gtag). Only send counts and outcomes as parameters:
 * never the names or amounts users paste.
 */
export enum AnalyticsEvent {
  CopySlip = 'copy_slip',
  DownloadImage = 'download_image',
  ExportCsv = 'export_csv',
}

/** Value of the `result` parameter on export events. */
export enum AnalyticsResult {
  Success = 'success',
  Failed = 'failed',
}
