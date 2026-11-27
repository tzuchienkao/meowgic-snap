import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { ref, type Ref } from 'vue';
import AppButton from '../../components/app/Button/Button.vue';
import AppCard from '../../components/app/Card/Card.vue';
import AppCatEarCard from '../../components/app/CatEarCard/CatEarCard.vue';
import AppDenomBadge from '../../components/app/DenomBadge/DenomBadge.vue';
import AppDialog from '../../components/app/Dialog/Dialog.vue';
import AppFilterChip from '../../components/app/FilterChip/FilterChip.vue';
import AppIconButton from '../../components/app/IconButton/IconButton.vue';
import AppIllustrationSlot from '../../components/app/IllustrationSlot/IllustrationSlot.vue';
import AppInput from '../../components/app/Input/Input.vue';
import AppPagination from '../../components/app/Pagination/Pagination.vue';
import AppRecordDetailCard from '../../components/app/RecordDetailCard/RecordDetailCard.vue';
import AppRecordRow from '../../components/app/RecordRow/RecordRow.vue';
import RecordDetail from '../../components/record/RecordDetail.vue';
import LogsPage from '../../pages/logs.vue';
import { AnalyticsEvent, AnalyticsResult } from '../../constants/analytics';
import { downloadBlob } from '../../utils/download';

vi.mock('../../utils/download', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/download')>()),
  downloadBlob: vi.fn(),
}));

/** The mock records run every 3 days back from 2026/11/20 */
const TODAY = new Date('2026-11-27T10:00:00+08:00');

let store: Record<string, Ref<unknown>>;
let showToast: ReturnType<typeof vi.fn>;
let gtag: ReturnType<typeof vi.fn>;
let matchesDesktop: boolean;
let scrollIntoView: ReturnType<typeof vi.fn>;
let wrapper: VueWrapper | undefined;

const mountPage = () => {
  wrapper = mount(LogsPage, {
    attachTo: document.body,
    global: {
      components: {
        AppButton,
        AppCard,
        AppCatEarCard,
        AppDenomBadge,
        AppDialog,
        AppFilterChip,
        AppIconButton,
        AppIllustrationSlot,
        AppInput,
        AppPagination,
        AppRecordDetailCard,
        AppRecordRow,
        RecordDetail,
      },
    },
  });
  return wrapper;
};

const rows = (w: VueWrapper) => w.findAll('.records-list .app-record-row');
const chip = (w: VueWrapper, label: string) => w.findAll('.app-filter-chip').find((c) => c.text() === label)!;
const button = (w: VueWrapper, label: string) => w.findAll('button').find((b) => b.text().includes(label))!;
const caption = (w: VueWrapper) => w.find('.app-pagination__caption').text();
/** The desktop detail beside the list */
const side = (w: VueWrapper) => w.find('.page-logs__side');
const detailName = (w: VueWrapper) => side(w).find('.record-detail__name').text();
/** Mobile: the selected row as a RecordDetailCard (CSS shows it only under the desktop breakpoint) */
const detailCards = (w: VueWrapper) => w.findAll('.records-list__detail-card');
const lastDownload = async () => {
  const [blob, fileName] = vi.mocked(downloadBlob).mock.calls.at(-1)!;
  return { fileName, lines: (await blob.text()).replace(/^﻿/, '').split('\r\n') };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
  store = {};
  showToast = vi.fn();
  gtag = vi.fn();
  matchesDesktop = true;
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView as unknown as Element['scrollIntoView'];
  vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
    if (!store[key]) store[key] = ref(init());
    return store[key] as Ref<T>;
  });
  vi.stubGlobal('useToast', () => ({ showToast }));
  vi.stubGlobal('useGtag', () => ({ gtag }));
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({ matches: matchesDesktop, media: query }) as MediaQueryList);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.mocked(downloadBlob).mockClear();
  vi.useRealTimers();
});

describe('pages/logs.vue', () => {
  it('keeps the title and subtitle, with 匯出這個區間 CSV beside them', () => {
    const w = mountPage();
    expect(w.find('h1').text()).toBe('紀錄');
    expect(w.find('.page-settings__header p').text()).toBe('每一次兌換都幫你記下來了，紀錄保存 2 年');
    const exportButton = w.find('.page-logs__header .app-button');
    expect(exportButton.text()).toContain('匯出這個區間 CSV');
    expect(exportButton.classes()).toEqual(expect.arrayContaining(['app-button--surface', 'app-button--md']));
  });

  describe('查詢區間', () => {
    it('starts at 近 3 個月 and explains the limits, saying it is not an accounting voucher', () => {
      const w = mountPage();
      expect(w.findAll('.app-filter-chip').map((c) => c.text())).toEqual(['近 1 個月', '近 3 個月', '近半年']);
      expect(w.find('.app-filter-chip--pressed').text()).toBe('近 3 個月');
      expect(w.findAll('.range-card__hint').map((h) => h.text())).toEqual([
        '紀錄保存 2 年 · 一次最多查半年 · 最多顯示 500 筆 · 每頁 50 筆',
        '這不是會計憑證，需要留存請匯出 CSV 自行保存',
      ]);
    });

    it('lists the records in the range, newest first, grouped by year', () => {
      const w = mountPage();
      expect(rows(w)).toHaveLength(29);
      expect(w.find('.records-list__year').text()).toMatch(/^2026 年\s+29 筆 ▲$/);
      const first = rows(w)[0]!;
      expect(first.find('.app-record-row__name').text()).toBe('11月薪資');
      expect(first.find('.app-record-row__meta').text()).toBe('2026/11/20 · 3 筆');
      expect(first.find('.app-record-row__amount').text()).toBe('37,187');
      expect(caption(w)).toBe('第 1–29 筆，共 29 筆');
    });

    it('switching the range goes back to page 1 with the new records', async () => {
      const w = mountPage();
      await chip(w, '近 1 個月').trigger('click');
      expect(w.find('.app-filter-chip--pressed').text()).toBe('近 1 個月');
      expect(rows(w)).toHaveLength(9);

      await chip(w, '近半年').trigger('click');
      expect(rows(w)).toHaveLength(50);
      expect(caption(w)).toBe('第 1–50 筆，共 60 筆');
    });
  });

  describe('pages', () => {
    it('shows 50 per page; the next page shows the rest from the top of the list', async () => {
      const w = mountPage();
      await chip(w, '近半年').trigger('click');
      const list = w.find('.records-list__scroll').element as HTMLElement;
      list.scrollTop = 400;
      await w.find('[aria-label="下一頁"]').trigger('click');
      expect(rows(w)).toHaveLength(10);
      expect(caption(w)).toBe('第 51–60 筆，共 60 筆');
      expect(w.find('.app-pagination__page--current').text()).toBe('2');
      // Desktop: the list scrolls inside, the page stays put
      expect(list.scrollTop).toBe(0);
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('under the desktop breakpoint the next page brings the list into view', async () => {
      matchesDesktop = false;
      const w = mountPage();
      await chip(w, '近半年').trigger('click');
      await w.find('[aria-label="下一頁"]').trigger('click');
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView.mock.contexts[0]).toBe(w.find('.records-list').element);
    });

    it('a new range starts from the top of the list', async () => {
      const w = mountPage();
      const list = w.find('.records-list__scroll').element as HTMLElement;
      list.scrollTop = 400;
      await chip(w, '近半年').trigger('click');
      expect(list.scrollTop).toBe(0);
    });

    it('folds and unfolds a year', async () => {
      const w = mountPage();
      const year = w.find('.records-list__year');
      await year.trigger('click');
      expect(year.attributes('aria-expanded')).toBe('false');
      expect(year.text()).toContain('29 筆 ▼');
      expect(w.find('.records-list__rows').isVisible()).toBe(false);
      await year.trigger('click');
      expect(year.attributes('aria-expanded')).toBe('true');
      expect(w.find('.records-list__rows').isVisible()).toBe(true);
    });
  });

  describe('the selected record', () => {
    it('is the newest one at first, shown in the hero card with the cash to prepare', () => {
      const w = mountPage();
      expect(rows(w)[0]!.classes()).toContain('app-record-row--selected');
      expect(w.findAll('.app-record-row--selected')).toHaveLength(1);
      expect(detailName(w)).toBe('11月薪資');
      expect(side(w).find('.record-detail__meta').text()).toBe('2026/11/20 · 3 筆 · 姓名＋金額');
      expect(side(w).find('.record-detail__amount').text()).toBe('37,187元');

      const cash = side(w).find('.record-detail__cash');
      expect(cash.find('.app-card__title').text()).toBe('這次要準備的現金');
      const badges = cash.findAll('.app-denom-badge');
      expect(badges.map((b) => b.find('.app-denom-badge__value').text())).toEqual([
        'NT$1,000', 'NT$500', 'NT$100', 'NT$50', 'NT$10', 'NT$5', 'NT$1',
      ]);
      badges.forEach((b) => expect(b.classes()).toEqual(expect.arrayContaining(['app-denom-badge--md', 'app-denom-badge--on-soft'])));
    });

    it('follows the clicked row; an amount-only record says 純金額', async () => {
      const w = mountPage();
      await rows(w)[4]!.trigger('click');
      expect(rows(w)[4]!.classes()).toContain('app-record-row--selected');
      expect(rows(w)[0]!.classes()).not.toContain('app-record-row--selected');
      expect(detailName(w)).toBe(rows(w)[4]!.find('.app-record-row__name').text());
      expect(side(w).find('.record-detail__meta').text()).toContain('· 純金額');
    });

    it('on desktop a click keeps the scroll, and clicking the selected row again keeps it selected', async () => {
      const w = mountPage();
      await rows(w)[1]!.trigger('click');
      await rows(w)[1]!.trigger('click');
      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(detailName(w)).toBe(rows(w)[1]!.find('.app-record-row__name').text());
      expect(detailCards(w)).toHaveLength(1);
    });

    describe('under the desktop breakpoint', () => {
      const card = (w: VueWrapper) => w.find('.records-list__detail-card');
      const head = (w: VueWrapper) => card(w).find('.app-record-detail-card__head');

      beforeEach(() => {
        matchesDesktop = false;
      });

      it('the selected record (the newest at first) is an open RecordDetailCard in place of its row', () => {
        const w = mountPage();
        expect(detailCards(w)).toHaveLength(1);
        const item = w.findAll('.records-list__item')[0]!;
        // The plain row stays for desktop only
        expect(item.find('.app-record-row').classes()).toContain('records-list__row--desktop-only');
        expect(w.findAll('.records-list__row--desktop-only')).toHaveLength(1);
        const itemCard = item.find('.app-record-detail-card');
        expect(itemCard.find('.app-record-detail-card__name').text()).toBe('11月薪資');
        expect(itemCard.find('.app-record-detail-card__meta').text()).toBe('2026/11/20 · 3 筆');
        expect(itemCard.find('.app-record-detail-card__format').text()).toBe('姓名＋金額 · 合計');
        expect(itemCard.find('.app-record-detail-card__amount').text()).toBe('37,187元');
        expect(itemCard.findAll('.app-denom-badge__value').map((v) => v.text())).toEqual([
          'NT$1,000', 'NT$500', 'NT$100', 'NT$50', 'NT$10', 'NT$5', 'NT$1',
        ]);
        expect(head(w).attributes('aria-expanded')).toBe('true');
      });

      it('tapping another row makes it the card and keeps it in view', async () => {
        const w = mountPage();
        await rows(w)[3]!.trigger('click');
        await flushPromises();
        const items = w.findAll('.records-list__item');
        expect(detailCards(w)).toHaveLength(1);
        expect(items[3]!.find('.app-record-detail-card__name').text()).toBe(rows(w)[3]!.find('.app-record-row__name').text());
        expect(items[0]!.find('.app-record-detail-card').exists()).toBe(false);
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
        expect(scrollIntoView.mock.contexts[0]).toBe(items[3]!.element);
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
      });

      it('tapping the card head folds it to a row with the amount; tapping again opens it', async () => {
        const w = mountPage();
        await head(w).trigger('click');
        expect(head(w).attributes('aria-expanded')).toBe('false');
        expect(card(w).find('.app-record-detail-card__head-amount').text()).toBe('37,187');
        expect(card(w).find('.app-record-detail-card__panel').attributes('inert')).toBeDefined();
        // Still the selected record: the card (with its ears) stays
        expect(detailCards(w)).toHaveLength(1);
        await head(w).trigger('click');
        expect(head(w).attributes('aria-expanded')).toBe('true');
        expect(card(w).find('.app-record-detail-card__panel').attributes('inert')).toBeUndefined();
        expect(scrollIntoView).not.toHaveBeenCalled();
      });

      it('a folded card opens again with a new range', async () => {
        const w = mountPage();
        await head(w).trigger('click');
        await chip(w, '近半年').trigger('click');
        expect(head(w).attributes('aria-expanded')).toBe('true');
      });

      it('改名 and 匯出這筆 CSV from the card', async () => {
        const w = mountPage();
        await card(w).find('.app-record-detail-card__rename').trigger('click');
        expect(w.find('.app-dialog__title').text()).toBe('幫這筆紀錄改名');
        await card(w).find('.app-record-detail-card__cash .app-button').trigger('click');
        expect(vi.mocked(downloadBlob)).toHaveBeenCalledTimes(1);
      });
    });

    it('goes back to the newest when the range changes', async () => {
      const w = mountPage();
      await rows(w)[3]!.trigger('click');
      await chip(w, '近半年').trigger('click');
      expect(rows(w)[0]!.classes()).toContain('app-record-row--selected');
      expect(detailName(w)).toBe('11月薪資');
    });
  });

  describe('改名', () => {
    const nameInput = (w: VueWrapper) => w.find('.app-dialog input');
    const saveButton = (w: VueWrapper) => w.findAll('.rename-dialog__actions button')[0]!;

    it('opens a dialog with the current name; 儲存 waits for a change', async () => {
      const w = mountPage();
      await button(w, '✎ 改名').trigger('click');
      expect(w.find('.app-dialog__title').text()).toBe('幫這筆紀錄改名');
      expect((nameInput(w).element as HTMLInputElement).value).toBe('11月薪資');
      expect(w.find('.app-dialog .app-input__meta').text()).toContain('5 / 20');
      expect(saveButton(w).attributes('disabled')).toBeDefined();
    });

    it('does not take an empty name or one over 20 characters', async () => {
      const w = mountPage();
      await button(w, '✎ 改名').trigger('click');
      await nameInput(w).setValue('   ');
      expect(w.find('.app-dialog .app-input__meta').text()).toContain('名稱不能空白喵');
      expect(saveButton(w).attributes('disabled')).toBeDefined();
      await nameInput(w).setValue('一'.repeat(21));
      expect(w.find('.app-dialog .app-input__meta').text()).toContain('最多 20 個字');
      expect(saveButton(w).attributes('disabled')).toBeDefined();
    });

    it('儲存 renames the record in the list and the detail, closes the dialog with a toast', async () => {
      const w = mountPage();
      await button(w, '✎ 改名').trigger('click');
      await nameInput(w).setValue('  年終獎金  ');
      await saveButton(w).trigger('click');
      await flushPromises();
      expect(w.find('.app-dialog').exists()).toBe(false);
      expect(showToast).toHaveBeenCalledWith('名稱改好了喵');
      expect(detailName(w)).toBe('年終獎金');
      expect(rows(w)[0]!.find('.app-record-row__name').text()).toBe('年終獎金');
    });

    it('先不要 closes it without renaming', async () => {
      const w = mountPage();
      await button(w, '✎ 改名').trigger('click');
      await nameInput(w).setValue('年終獎金');
      await button(w, '先不要').trigger('click');
      expect(w.find('.app-dialog').exists()).toBe(false);
      expect(detailName(w)).toBe('11月薪資');
    });
  });

  describe('CSV', () => {
    it('匯出這筆 CSV downloads the selected record, named by its date', async () => {
      const w = mountPage();
      await button(w, '匯出這筆 CSV').trigger('click');
      const { fileName, lines } = await lastDownload();
      expect(fileName).toMatch(/^領款明細_20261120-\d{4}\.csv$/);
      expect(lines[0]).toBe('姓名,金額,NT$1000,NT$500,NT$100,NT$50,NT$10,NT$5,NT$1');
      expect(lines).toHaveLength(1 + 3 + 1);
      expect(lines.at(-1)!.startsWith('合計,37187,')).toBe(true);
      expect(gtag).toHaveBeenCalledWith('event', AnalyticsEvent.ExportRecordCsv, { result: AnalyticsResult.Success, entry_count: 3 });
      expect(showToast).toHaveBeenCalledWith('CSV 匯出好了喵');
    });

    it('匯出這個區間 CSV downloads every record in the range', async () => {
      const w = mountPage();
      await chip(w, '近半年').trigger('click');
      await button(w, '匯出這個區間 CSV').trigger('click');
      await flushPromises();
      const { fileName, lines } = await lastDownload();
      expect(fileName).toMatch(/^兌換紀錄_20261127-\d{4}\.csv$/);
      expect(lines[0]).toBe('日期,名稱,筆數,金額,NT$1000,NT$500,NT$100,NT$50,NT$10,NT$5,NT$1');
      // All 60 records, not only the 50 on this page
      expect(lines).toHaveLength(1 + 60 + 1);
      expect(lines[1]!.startsWith('2026/11/20,11月薪資,3,37187,')).toBe(true);
      expect(gtag).toHaveBeenCalledWith('event', AnalyticsEvent.ExportRangeCsv, { result: AnalyticsResult.Success, record_count: 60 });
    });

    it('a failed download says so', async () => {
      vi.mocked(downloadBlob).mockImplementationOnce(() => {
        throw new Error('blocked');
      });
      const w = mountPage();
      await button(w, '匯出這筆 CSV').trigger('click');
      expect(showToast).toHaveBeenCalledWith('CSV 沒有匯出成功喵');
      expect(gtag).toHaveBeenCalledWith('event', AnalyticsEvent.ExportRecordCsv, { result: AnalyticsResult.Failed, entry_count: 3 });
    });
  });

  it('with nothing in the range: a placeholder instead of the list, and nothing to export', () => {
    vi.setSystemTime(new Date('2028-01-01T10:00:00+08:00'));
    const w = mountPage();
    expect(w.find('.page-logs__body').exists()).toBe(false);
    const slot = w.find('.app-cat-ear-card .logs-empty');
    expect(slot.classes()).toContain('app-illustration-slot--placeholder');
    expect(slot.find('.app-illustration-slot__label').text()).toBe('貓咪插畫：翻開空白的紀錄本');
    expect(slot.find('.logs-empty__text').text()).toBe('這段期間沒有兌換紀錄喵');
    expect(w.find('.page-logs__header .app-button').attributes('disabled')).toBeDefined();
    // The range chips stay, so another range can still be picked
    expect(w.findAll('.app-filter-chip')).toHaveLength(3);
  });
});
