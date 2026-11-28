import type { Ref } from 'vue';
import { AnalyticsEvent, AnalyticsResult } from '~/constants/analytics';
import type { IResultRow } from '~/types/denomination';
import { buildCsv, buildExportFileName, buildSlipImageModel, buildSlipText, ExportExt } from '~/utils/exporters';
import { copyText, createCsvBlob, downloadBlob, drawSlipImage } from '~/utils/download';

const EXPORT_MESSAGES = {
  copyDone: '領款單已複製，可以貼給銀行了喵',
  copyFailed: '複製失敗了喵，再試一次看看',
  imageDone: '明細圖下載好了喵',
  imageFailed: '明細圖下載失敗了喵，再試一次看看',
  csvDone: 'CSV 匯出好了喵',
  csvFailed: 'CSV 匯出失敗了喵，再試一次看看'
} as const;

/** What the exports read from the calculation shown */
export interface IResultExportSource {
  totalAmount: Ref<number>;
  entryCount: Ref<number>;
  /** Data format the calculation used (編號 vs 姓名 CSV header) */
  includesNames: Ref<boolean>;
  calculatedDate: Ref<Date | null>;
  rows: Ref<IResultRow[]>;
  totals: Ref<Record<number, number>>;
  /** The denominations the calculation used */
  denominations: Ref<number[]>;
}

/** 首頁 result: 複製領款單 · 下載明細圖 · 匯出 CSV, each with a toast and a GA event (counts only) */
export const useResultExports = (source: IResultExportSource) => {
  const { showToast } = useToast();
  const { gtag } = useGtag();

  const slipInput = () => ({
    totalAmount: source.totalAmount.value,
    totals: source.totals.value,
    denominations: source.denominations.value,
  });

  // GA: which export was used and whether it worked, with the entry count only (no names or amounts)
  const trackExport = (event: AnalyticsEvent, isSuccess: boolean) => {
    gtag('event', event, {
      result: isSuccess ? AnalyticsResult.Success : AnalyticsResult.Failed,
      entry_count: source.entryCount.value,
    });
  };

  const copySlip = async () => {
    const copied = await copyText(buildSlipText(slipInput()));
    trackExport(AnalyticsEvent.CopySlip, copied);
    showToast(copied ? EXPORT_MESSAGES.copyDone : EXPORT_MESSAGES.copyFailed);
  };

  const downloadImage = async () => {
    try {
      const model = buildSlipImageModel({
        ...slipInput(),
        calculatedAt: source.calculatedDate.value ?? new Date(),
        entryCount: source.entryCount.value,
      });
      const blob = await drawSlipImage(model);
      downloadBlob(blob, buildExportFileName(ExportExt.Png, new Date()));
      trackExport(AnalyticsEvent.DownloadImage, true);
      showToast(EXPORT_MESSAGES.imageDone);
    } catch {
      trackExport(AnalyticsEvent.DownloadImage, false);
      showToast(EXPORT_MESSAGES.imageFailed);
    }
  };

  const exportCsv = () => {
    try {
      const csv = buildCsv({
        rows: source.rows.value,
        totalAmount: source.totalAmount.value,
        denominations: source.denominations.value,
        includesNames: source.includesNames.value,
      });
      downloadBlob(createCsvBlob(csv), buildExportFileName(ExportExt.Csv, new Date()));
      trackExport(AnalyticsEvent.ExportCsv, true);
      showToast(EXPORT_MESSAGES.csvDone);
    } catch {
      trackExport(AnalyticsEvent.ExportCsv, false);
      showToast(EXPORT_MESSAGES.csvFailed);
    }
  };

  return { copySlip, downloadImage, exportCsv };
};
