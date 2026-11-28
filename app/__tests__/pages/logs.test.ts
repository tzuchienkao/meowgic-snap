import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, ref, Suspense, watch, type WatchSource } from 'vue';
import AppButton from '../../components/app/Button/Button.vue';
import AppCard from '../../components/app/Card/Card.vue';
import AppCatEarCard from '../../components/app/CatEarCard/CatEarCard.vue';
import AppDatePicker from '../../components/app/DatePicker/DatePicker.vue';
import AppDenomBadge from '../../components/app/DenomBadge/DenomBadge.vue';
import AppDialog from '../../components/app/Dialog/Dialog.vue';
import AppFilterChip from '../../components/app/FilterChip/FilterChip.vue';
import AppIconButton from '../../components/app/IconButton/IconButton.vue';
import AppIllustrationSlot from '../../components/app/IllustrationSlot/IllustrationSlot.vue';
import AppPageHeader from '../../components/app/PageHeader/PageHeader.vue';
import AppEmptyState from '../../components/app/EmptyState/EmptyState.vue';
import AppInput from '../../components/app/Input/Input.vue';
import AppPagination from '../../components/app/Pagination/Pagination.vue';
import AppRecordDetailCard from '../../components/app/RecordDetailCard/RecordDetailCard.vue';
import AppRecordRow from '../../components/app/RecordRow/RecordRow.vue';
import RecordDetail from '../../components/record/RecordDetail.vue';
import LogsPage from '../../pages/logs.vue';
import { AnalyticsEvent, AnalyticsResult } from '../../constants/analytics';
import { InputFormat } from '../../types/record';
import { downloadBlob } from '../../utils/download';
import { amountOnlyEntryName, calculateDenominations, DEFAULT_DENOMINATIONS } from '../../utils/moneyParser';

vi.mock('../../utils/download', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/download')>()),
  downloadBlob: vi.fn(),
}));

/** The records below run every 3 days back from 2026/11/20 */
const TODAY = new Date('2026-11-27T10:00:00+08:00');

/** A row of public.records, as Supabase returns it */
interface IRecordRow {
  id: string;
  name: string;
  input_format: InputFormat;
  entry_count: number;
  total_amount: number;
  denominations: number[];
  denomination_counts: Record<number, number>;
  rows: { name: string; total: number }[];
  created_at: string;
}

const RECORD_COUNT = 64;
const DAYS_APART = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const PEOPLE = ['王小明', '陳美玲', '林志豪', '張雅婷', '李俊傑', '黃淑芬', '吳承恩', '蔡依林', '鄭文華', '許家豪', '周雨萱', '謝明哲'];
const TITLES = ['薪資', '工讀費', '獎金', '零用金'];

/** 64 records, every 3 days back from 2026/11/20; every 5th is 純金額 */
const buildRecordRows = (): IRecordRow[] => {
  const newest = new Date('2026-11-20T12:00:00+08:00').getTime();
  return Array.from({ length: RECORD_COUNT }, (_, i) => {
    const createdAt = new Date(newest - i * DAYS_APART * DAY_MS);
    const inputFormat = i % 5 === 4 ? InputFormat.AmountOnly : InputFormat.NameAndAmount;
    const entryCount = 3 + (i % 10);
    const rows = Array.from({ length: entryCount }, (_, j) => ({
      name: inputFormat === InputFormat.AmountOnly ? amountOnlyEntryName(j + 1) : PEOPLE[j % PEOPLE.length]!,
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
      id: `record-${i + 1}`,
      name: `${createdAt.getMonth() + 1}月${TITLES[i % TITLES.length]}`,
      input_format: inputFormat,
      entry_count: entryCount,
      total_amount: rows.reduce((sum, row) => sum + row.total, 0),
      denominations,
      denomination_counts: denominationCounts,
      rows,
      created_at: createdAt.toISOString(),
    };
  });
};

type Column = keyof IRecordRow;

/**
 * Just enough of the Supabase query builder for utils/records.ts, over an in-memory table:
 * select (columns, count), gte, eq, order, range, limit, update, single. Awaiting it runs the query.
 * `updateBlocked` makes an update match no row, like RLS refusing it; `listFails` / `detailFails` make the
 * list (the query with a count) / a whole record fail; `selects` lists the selected columns.
 */
const createSupabase = (table: IRecordRow[]) => {
  const state = { updateBlocked: false, listFails: false, detailFails: false, selects: [] as string[] };
  const from = vi.fn(() => {
    let rows = [...table];
    let columns: Column[] | null = null;
    let withCount = false;
    let total = 0;
    let isSingle = false;
    let changes: Partial<IRecordRow> | null = null;
    const query = {
      select(selected = '*', options?: { count?: string }) {
        state.selects.push(selected);
        columns = selected === '*' ? null : (selected.split(',').map((column) => column.trim()) as Column[]);
        withCount = !!options?.count;
        return query;
      },
      gte(column: Column, value: string) {
        rows = rows.filter((row) => String(row[column]) >= value);
        return query;
      },
      lt(column: Column, value: string) {
        rows = rows.filter((row) => String(row[column]) < value);
        return query;
      },
      eq(column: Column, value: unknown) {
        rows = rows.filter((row) => row[column] === value);
        return query;
      },
      order(column: Column, { ascending }: { ascending: boolean }) {
        rows.sort((a, b) => (String(a[column]) < String(b[column]) === ascending ? -1 : 1));
        return query;
      },
      range(start: number, end: number) {
        total = rows.length;
        rows = rows.slice(start, end + 1);
        return query;
      },
      limit(count: number) {
        rows = rows.slice(0, count);
        return query;
      },
      update(values: Partial<IRecordRow>) {
        changes = values;
        return query;
      },
      single() {
        isSingle = true;
        return query;
      },
      then(resolve: (result: unknown) => void) {
        if ((withCount && state.listFails) || (isSingle && !changes && state.detailFails)) {
          resolve({ data: null, count: null, error: { code: '500', message: 'Failed to fetch' } });
          return;
        }
        if (changes) {
          if (state.updateBlocked) rows = [];
          rows.forEach((row) => Object.assign(row, changes));
        }
        const picked = rows.map((row) =>
          columns ? Object.fromEntries(columns.map((column) => [column, row[column]])) : { ...row },
        );
        const count = withCount ? total || picked.length : null;
        if (isSingle) {
          resolve(
            picked.length === 1
              ? { data: picked[0], error: null }
              : { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } },
          );
          return;
        }
        resolve({ data: picked, count, error: null });
      },
    };
    return query;
  });
  return { state, client: { from } };
};

/**
 * Like Nuxt's useAsyncData: runs the handler (a thrown error lands in `error`), keeps the last data
 * while it runs again, runs again when a `watch` source changes, and `refresh()` runs it again.
 */
const useAsyncDataStub = async <T>(_key: string, handler: () => Promise<T>, options?: { watch?: WatchSource[] }) => {
  const data = ref<T | undefined>(undefined);
  const error = ref<unknown>(undefined);
  const status = ref('idle');
  const refresh = async () => {
    status.value = 'pending';
    try {
      data.value = await handler();
      error.value = undefined;
      status.value = 'success';
    } catch (e) {
      error.value = e;
      status.value = 'error';
    }
  };
  if (options?.watch) watch(options.watch, () => refresh());
  await refresh();
  return { data, error, status, refresh };
};

let table: IRecordRow[];
let query: Record<string, string>;
let supabase: ReturnType<typeof createSupabase>;
let showToast: ReturnType<typeof vi.fn>;
let gtag: ReturnType<typeof vi.fn>;
let matchesDesktop: boolean;
let scrollIntoView: ReturnType<typeof vi.fn>;
let wrapper: VueWrapper | undefined;

// The page awaits its data in setup, so it needs a Suspense around it
const mountPage = async () => {
  wrapper = mount(defineComponent({ render: () => h(Suspense, null, { default: () => h(LogsPage) }) }), {
    attachTo: document.body,
    global: {
      components: {
        AppButton,
        AppCard,
        AppCatEarCard,
        AppDatePicker,
        AppDenomBadge,
        AppDialog,
        AppFilterChip,
        AppIconButton,
        AppIllustrationSlot,
        AppEmptyState,
        AppPageHeader,
        AppInput,
        AppPagination,
        AppRecordDetailCard,
        AppRecordRow,
        RecordDetail,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

/** Click, then let the refetches it starts finish */
const click = async (target: DOMWrapper<Element>) => {
  await target.trigger('click');
  await flushPromises();
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
  table = buildRecordRows();
  supabase = createSupabase(table);
  showToast = vi.fn();
  gtag = vi.fn();
  matchesDesktop = true;
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView as unknown as Element['scrollIntoView'];
  query = {};
  vi.stubGlobal('useRoute', () => ({ query }));
  vi.stubGlobal('useNuxtApp', () => ({ $supabase: supabase.client }));
  vi.stubGlobal('useAsyncData', useAsyncDataStub);
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
  it('keeps the title and subtitle, with 匯出這個區間 CSV beside them', async () => {
    const w = await mountPage();
    expect(w.find('h1').text()).toBe('紀錄');
    expect(w.find('.app-page-header__description').text()).toBe('每一次兌換都幫你記下來了，紀錄保存 2 年');
    const exportButton = w.find('.app-page-header .app-button');
    expect(exportButton.text()).toContain('匯出這個區間 CSV');
    expect(exportButton.classes()).toEqual(expect.arrayContaining(['app-button--surface', 'app-button--md']));
  });

  describe('查詢區間', () => {
    it('starts at 近 3 個月 and explains the limits, saying it is not an accounting voucher', async () => {
      const w = await mountPage();
      expect(w.findAll('.app-filter-chip').map((c) => c.text())).toEqual(['近 1 個月', '近 3 個月', '近半年', '自訂']);
      expect(w.find('.app-filter-chip--pressed').text()).toBe('近 3 個月');
      expect(w.findAll('.range-card__hint').map((h) => h.text())).toEqual([
        '紀錄保存 2 年 · 一次最多查半年 · 最多顯示 500 筆 · 每頁 50 筆',
        '這不是會計憑證，需要留存請匯出 CSV 自行保存',
      ]);
    });

    it('lists the records in the range, newest first, grouped by year', async () => {
      const w = await mountPage();
      expect(rows(w)).toHaveLength(29);
      expect(w.find('.records-list__year').text()).toMatch(/^2026 年\s+29 筆 ▲$/);
      const first = rows(w)[0]!;
      expect(first.find('.app-record-row__name').text()).toBe('11月薪資');
      expect(first.find('.app-record-row__meta').text()).toBe('2026/11/20 · 3 筆');
      expect(first.find('.app-record-row__amount').text()).toBe('37,187');
      expect(caption(w)).toBe('第 1–29 筆，共 29 筆');
    });

    it('switching the range goes back to page 1 with the new records', async () => {
      const w = await mountPage();
      await click(chip(w, '近 1 個月'));
      expect(w.find('.app-filter-chip--pressed').text()).toBe('近 1 個月');
      expect(rows(w)).toHaveLength(9);

      await click(chip(w, '近半年'));
      expect(rows(w)).toHaveLength(50);
      expect(caption(w)).toBe('第 1–50 筆，共 60 筆');
    });
  });

  describe('自訂 查詢區間', () => {
    const dateInputs = (w: VueWrapper) => w.findAll<HTMLInputElement>('.custom-range input[type="date"]');
    const error = (w: VueWrapper) => w.find('.custom-range__error');
    const pick = async (w: VueWrapper, start: string, end: string) => {
      await dateInputs(w)[0]!.setValue(start);
      await dateInputs(w)[1]!.setValue(end);
      await click(button(w, '查詢'));
    };
    /** Records whose created_at falls on these local days */
    const countBetween = (start: string, end: string) =>
      table.filter((row) => {
        const day = new Date(row.created_at);
        const value = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        return value >= start && value <= end;
      }).length;

    it('自訂 opens two date fields from the shown range to today, within 2 years', async () => {
      const w = await mountPage();
      expect(w.find('.custom-range').exists()).toBe(false);
      await chip(w, '自訂').trigger('click');
      expect(w.find('.app-filter-chip--pressed').text()).toBe('自訂');
      const [start, end] = dateInputs(w);
      expect(start!.element.value).toBe('2026-08-27');
      expect(end!.element.value).toBe('2026-11-27');
      expect(start!.attributes('min')).toBe('2024-11-27');
      expect(end!.attributes('max')).toBe('2026-11-27');
      // The list stays until 查詢
      expect(rows(w)).toHaveLength(29);
    });

    it('查詢 shows the records of those days, from page 1', async () => {
      const w = await mountPage();
      await chip(w, '自訂').trigger('click');
      await pick(w, '2026-06-01', '2026-07-31');
      expect(error(w).exists()).toBe(false);
      const expected = countBetween('2026-06-01', '2026-07-31');
      expect(rows(w)).toHaveLength(expected);
      expect(caption(w)).toBe(`第 1–${expected} 筆，共 ${expected} 筆`);
      expect(rows(w)[0]!.find('.app-record-row__meta').text()).toMatch(/^2026\/07\//);
      expect(rows(w)[0]!.classes()).toContain('app-record-row--selected');
    });

    it.each([
      ['', '2026-11-27', '請選開始和結束日期喵'],
      ['2026-10-01', '2026-09-01', '開始日期要在結束日期之前喵'],
      ['2026-01-01', '2026-07-02', '一次最多查半年喵'],
      // Days outside min / max: utils/recordPeriod.test.ts (happy-dom empties such a date input)
    ])('does not query %s – %s: %s', async (start, end, message) => {
      const w = await mountPage();
      await chip(w, '自訂').trigger('click');
      await pick(w, start, end);
      expect(error(w).text()).toBe(message);
      expect(rows(w)).toHaveLength(29);
    });

    it('desktop: the DatePicker shows the days, and 套用 queries them', async () => {
      const w = await mountPage();
      await chip(w, '自訂').trigger('click');
      const picker = w.find('.custom-range__picker');
      expect(picker.find('.app-date-picker__value').text()).toBe('2026/08/27 – 2026/11/27');
      await picker.find('.app-date-picker__trigger').trigger('click');
      // Back to June 2026 through the month grid
      await picker.find('.app-date-picker__title').trigger('click');
      await picker.findAll('.app-date-picker__choice')[5]!.trigger('click');
      await picker.find('[data-day="2026-06-01"]').trigger('click');
      await picker.find('[data-day="2026-06-30"]').trigger('click');
      await click(picker.findAll('.app-date-picker__footer button').find((b) => b.text() === '套用')!);
      expect(picker.find('.app-date-picker__value').text()).toBe('2026/06/01 – 2026/06/30');
      expect(rows(w)).toHaveLength(countBetween('2026-06-01', '2026-06-30'));
    });

    it('a 近 N 個月 chip closes the date fields and queries that range', async () => {
      const w = await mountPage();
      await chip(w, '自訂').trigger('click');
      await pick(w, '2026-06-01', '2026-07-31');
      await click(chip(w, '近 1 個月'));
      expect(w.find('.custom-range').exists()).toBe(false);
      expect(w.find('.app-filter-chip--pressed').text()).toBe('近 1 個月');
      expect(rows(w)).toHaveLength(9);
    });

    it('匯出這個區間 CSV exports the 自訂 days', async () => {
      const w = await mountPage();
      await chip(w, '自訂').trigger('click');
      await pick(w, '2026-06-01', '2026-07-31');
      await click(button(w, '匯出這個區間 CSV'));
      const { lines } = await lastDownload();
      expect(lines).toHaveLength(1 + countBetween('2026-06-01', '2026-07-31') + 1);
    });
  });

  describe('a record linked from 儀表板', () => {
    it('opens on it, in the shortest range that has it', async () => {
      query = { record: 'record-3', at: table[2]!.created_at };
      const w = await mountPage();
      expect(w.find('.app-filter-chip--pressed').text()).toBe('近 1 個月');
      expect(rows(w)[2]!.classes()).toContain('app-record-row--selected');
      expect(detailName(w)).toBe(table[2]!.name);
    });

    it('an older one opens 自訂, ending on its day so it comes first', async () => {
      const linked = table[62]!;
      query = { record: linked.id, at: linked.created_at };
      const w = await mountPage();
      expect(w.find('.app-filter-chip--pressed').text()).toBe('自訂');
      const [start, end] = w.findAll<HTMLInputElement>('.custom-range input[type="date"]');
      expect(end!.element.value).toBe('2026-05-18');
      expect(start!.element.value).toBe('2025-11-18');
      expect(rows(w)[0]!.classes()).toContain('app-record-row--selected');
      expect(detailName(w)).toBe(linked.name);
    });

    it('ignores a link without a valid date', async () => {
      query = { record: 'record-3', at: 'yesterday' };
      const w = await mountPage();
      expect(w.find('.app-filter-chip--pressed').text()).toBe('近 3 個月');
      expect(detailName(w)).toBe('11月薪資');
    });
  });

  describe('pages', () => {
    it('shows 50 per page; the next page shows the rest from the top of the list', async () => {
      const w = await mountPage();
      await click(chip(w, '近半年'));
      const list = w.find('.records-list__scroll').element as HTMLElement;
      list.scrollTop = 400;
      await click(w.find('[aria-label="下一頁"]'));
      expect(rows(w)).toHaveLength(10);
      expect(caption(w)).toBe('第 51–60 筆，共 60 筆');
      expect(w.find('.app-pagination__page--current').text()).toBe('2');
      // Desktop: the list scrolls inside, the page stays put
      expect(list.scrollTop).toBe(0);
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('under the desktop breakpoint the next page brings the list into view', async () => {
      matchesDesktop = false;
      const w = await mountPage();
      await click(chip(w, '近半年'));
      await click(w.find('[aria-label="下一頁"]'));
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView.mock.contexts[0]).toBe(w.find('.records-list').element);
    });

    it('a new range starts from the top of the list', async () => {
      const w = await mountPage();
      const list = w.find('.records-list__scroll').element as HTMLElement;
      list.scrollTop = 400;
      await click(chip(w, '近半年'));
      expect(list.scrollTop).toBe(0);
    });

    it('folds and unfolds a year', async () => {
      const w = await mountPage();
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
    it('is the newest one at first, shown in the hero card with the cash to prepare', async () => {
      const w = await mountPage();
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
      const w = await mountPage();
      await click(rows(w)[4]!);
      expect(rows(w)[4]!.classes()).toContain('app-record-row--selected');
      expect(rows(w)[0]!.classes()).not.toContain('app-record-row--selected');
      expect(detailName(w)).toBe(rows(w)[4]!.find('.app-record-row__name').text());
      expect(side(w).find('.record-detail__meta').text()).toContain('· 純金額');
    });

    it('on desktop a click keeps the scroll, and clicking the selected row again keeps it selected', async () => {
      const w = await mountPage();
      await click(rows(w)[1]!);
      await click(rows(w)[1]!);
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

      it('the selected record (the newest at first) is an open RecordDetailCard in place of its row', async () => {
        const w = await mountPage();
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
        const w = await mountPage();
        await click(rows(w)[3]!);
        const items = w.findAll('.records-list__item');
        expect(detailCards(w)).toHaveLength(1);
        expect(items[3]!.find('.app-record-detail-card__name').text()).toBe(rows(w)[3]!.find('.app-record-row__name').text());
        expect(items[0]!.find('.app-record-detail-card').exists()).toBe(false);
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
        expect(scrollIntoView.mock.contexts[0]).toBe(items[3]!.element);
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
      });

      it('tapping the card head folds it to a row with the amount; tapping again opens it', async () => {
        const w = await mountPage();
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
        const w = await mountPage();
        await head(w).trigger('click');
        await click(chip(w, '近半年'));
        expect(head(w).attributes('aria-expanded')).toBe('true');
      });

      it('改名 and 匯出這筆 CSV from the card', async () => {
        const w = await mountPage();
        await card(w).find('.app-record-detail-card__rename').trigger('click');
        expect(w.find('.app-dialog__title').text()).toBe('幫這筆紀錄改名');
        await card(w).find('.app-record-detail-card__cash .app-button').trigger('click');
        expect(vi.mocked(downloadBlob)).toHaveBeenCalledTimes(1);
      });
    });

    it('the selected fill slides on a row click, but not to the first row of a new range or page', async () => {
      const w = await mountPage();
      const indicator = () => w.find('.records-list__indicator');
      expect(indicator().classes()).not.toContain('records-list__indicator--sliding');
      await click(rows(w)[2]!);
      expect(indicator().classes()).toContain('records-list__indicator--sliding');
      await click(chip(w, '近半年'));
      expect(indicator().classes()).not.toContain('records-list__indicator--sliding');
      await click(rows(w)[1]!);
      await click(w.find('[aria-label="下一頁"]'));
      expect(indicator().classes()).not.toContain('records-list__indicator--sliding');
    });

    it('goes back to the newest when the range changes', async () => {
      const w = await mountPage();
      await click(rows(w)[3]!);
      await click(chip(w, '近半年'));
      expect(rows(w)[0]!.classes()).toContain('app-record-row--selected');
      expect(detailName(w)).toBe('11月薪資');
    });
  });

  describe('改名', () => {
    const nameInput = (w: VueWrapper) => w.find('.app-dialog input');
    const saveButton = (w: VueWrapper) => w.findAll('.rename-dialog__actions button')[0]!;

    it('opens a dialog with the current name; 儲存 waits for a change', async () => {
      const w = await mountPage();
      await button(w, '✎ 改名').trigger('click');
      expect(w.find('.app-dialog__title').text()).toBe('幫這筆紀錄改名');
      expect((nameInput(w).element as HTMLInputElement).value).toBe('11月薪資');
      expect(w.find('.app-dialog .app-input__meta').text()).toContain('5 / 20');
      expect(saveButton(w).attributes('disabled')).toBeDefined();
    });

    it('does not take an empty name or one over 20 characters', async () => {
      const w = await mountPage();
      await button(w, '✎ 改名').trigger('click');
      await nameInput(w).setValue('   ');
      expect(w.find('.app-dialog .app-input__meta').text()).toContain('名稱不能空白喵');
      expect(saveButton(w).attributes('disabled')).toBeDefined();
      await nameInput(w).setValue('一'.repeat(21));
      expect(w.find('.app-dialog .app-input__meta').text()).toContain('最多 20 個字');
      expect(saveButton(w).attributes('disabled')).toBeDefined();
    });

    it('儲存 renames the record in the list and the detail, closes the dialog with a toast', async () => {
      const w = await mountPage();
      await button(w, '✎ 改名').trigger('click');
      await nameInput(w).setValue('  年終獎金  ');
      await click(saveButton(w));
      expect(w.find('.app-dialog').exists()).toBe(false);
      expect(showToast).toHaveBeenCalledWith('名稱改好了喵');
      expect(detailName(w)).toBe('年終獎金');
      expect(rows(w)[0]!.find('.app-record-row__name').text()).toBe('年終獎金');
    });

    it('a rename the database refuses keeps the dialog open and says so', async () => {
      supabase.state.updateBlocked = true;
      const w = await mountPage();
      await button(w, '✎ 改名').trigger('click');
      await nameInput(w).setValue('年終獎金');
      await click(saveButton(w));
      expect(showToast).toHaveBeenCalledWith('名稱沒有改成功喵，再試一次看看');
      expect(w.find('.app-dialog').exists()).toBe(true);
      expect(detailName(w)).toBe('11月薪資');
      expect(rows(w)[0]!.find('.app-record-row__name').text()).toBe('11月薪資');
    });

    it('先不要 closes it without renaming', async () => {
      const w = await mountPage();
      await button(w, '✎ 改名').trigger('click');
      await nameInput(w).setValue('年終獎金');
      await button(w, '先不要').trigger('click');
      expect(w.find('.app-dialog').exists()).toBe(false);
      expect(detailName(w)).toBe('11月薪資');
    });
  });

  describe('CSV', () => {
    it('匯出這筆 CSV downloads the selected record, named by its date', async () => {
      const w = await mountPage();
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
      const w = await mountPage();
      await click(chip(w, '近半年'));
      await click(button(w, '匯出這個區間 CSV'));
      const { fileName, lines } = await lastDownload();
      expect(fileName).toMatch(/^兌換紀錄_20261127-\d{4}\.csv$/);
      expect(lines[0]).toBe('日期,名稱,筆數,金額,NT$1000,NT$500,NT$100,NT$50,NT$10,NT$5,NT$1');
      // All 60 records, not only the 50 on this page
      expect(lines).toHaveLength(1 + 60 + 1);
      expect(lines[1]!.startsWith('2026/11/20,11月薪資,3,37187,')).toBe(true);
      expect(gtag).toHaveBeenCalledWith('event', AnalyticsEvent.ExportRangeCsv, { result: AnalyticsResult.Success, record_count: 60 });
      // The names and amounts of each entry (rows) are not fetched for it
      expect(supabase.state.selects.at(-1)).not.toContain('rows');
    });

    it('a failed download says so', async () => {
      vi.mocked(downloadBlob).mockImplementationOnce(() => {
        throw new Error('blocked');
      });
      const w = await mountPage();
      await button(w, '匯出這筆 CSV').trigger('click');
      expect(showToast).toHaveBeenCalledWith('CSV 沒有匯出成功喵');
      expect(gtag).toHaveBeenCalledWith('event', AnalyticsEvent.ExportRecordCsv, { result: AnalyticsResult.Failed, entry_count: 3 });
    });
  });

  describe('loading', () => {
    it('a new range keeps the old list, dimmed, until the new one arrives', async () => {
      const w = await mountPage();
      await chip(w, '近半年').trigger('click');
      // The refetch has started but not finished
      const list = w.find('.records-list');
      expect(list.attributes('aria-busy')).toBe('true');
      expect(rows(w)).toHaveLength(29);
      await flushPromises();
      expect(list.attributes('aria-busy')).toBe('false');
      expect(rows(w)).toHaveLength(50);
    });

    it('another record: the row is selected at once, the old detail stays dimmed until the new one arrives', async () => {
      const w = await mountPage();
      await rows(w)[2]!.trigger('click');
      expect(rows(w)[2]!.classes()).toContain('app-record-row--selected');
      expect(side(w).attributes('aria-busy')).toBe('true');
      expect(detailName(w)).toBe('11月薪資');
      await flushPromises();
      expect(side(w).attributes('aria-busy')).toBe('false');
      expect(detailName(w)).toBe(rows(w)[2]!.find('.app-record-row__name').text());
    });
  });

  describe('load failures', () => {
    it('the list: says so with 重試 instead of the list, and nothing to export', async () => {
      supabase.state.listFails = true;
      const w = await mountPage();
      expect(w.find('.page-logs__body').exists()).toBe(false);
      expect(w.find('.app-empty-state__message').text()).toBe('資料沒有載入成功喵');
      expect(w.find('.app-page-header .app-button').attributes('disabled')).toBeDefined();

      supabase.state.listFails = false;
      await click(button(w, '重試'));
      expect(rows(w)).toHaveLength(29);
      expect(detailName(w)).toBe('11月薪資');
    });

    it('a new range that fails says so too', async () => {
      const w = await mountPage();
      supabase.state.listFails = true;
      await click(chip(w, '近半年'));
      expect(w.find('.app-empty-state__message').text()).toBe('資料沒有載入成功喵');
    });

    it('the detail: says so with 重試 beside the list, which stays', async () => {
      supabase.state.detailFails = true;
      const w = await mountPage();
      expect(rows(w)).toHaveLength(29);
      expect(rows(w)[0]!.classes()).toContain('app-record-row--selected');
      expect(w.find('.record-detail').exists()).toBe(false);
      const error = w.find('.page-logs__side');
      expect(error.find('.detail-error__text').text()).toBe('這筆紀錄沒有載入成功喵');

      supabase.state.detailFails = false;
      await click(error.find('button'));
      expect(detailName(w)).toBe('11月薪資');
      expect(w.find('.detail-error').exists()).toBe(false);
    });

    it('under the desktop breakpoint the detail failure sits under the selected row', async () => {
      matchesDesktop = false;
      supabase.state.detailFails = true;
      const w = await mountPage();
      const item = w.findAll('.records-list__item')[0]!;
      expect(item.find('.app-record-detail-card').exists()).toBe(false);
      // The row is not replaced by a card, so it shows on mobile too
      expect(item.find('.app-record-row').classes()).not.toContain('records-list__row--desktop-only');
      expect(item.find('.records-list__detail-error .detail-error__text').text()).toBe('這筆紀錄沒有載入成功喵');

      supabase.state.detailFails = false;
      await click(item.find('.records-list__detail-error button'));
      expect(item.find('.app-record-detail-card').exists()).toBe(true);
    });
  });

  it('with nothing in the range: the empty-notebook cat instead of the list, and nothing to export', async () => {
    vi.setSystemTime(new Date('2028-01-01T10:00:00+08:00'));
    const w = await mountPage();
    expect(w.find('.page-logs__body').exists()).toBe(false);
    const slot = w.find('.app-cat-ear-card .app-empty-state');
    expect(slot.classes()).not.toContain('app-illustration-slot--placeholder');
    expect(slot.find('img').attributes('alt')).toBe('貓咪插畫：翻開空白的紀錄本');
    expect(slot.find('.app-empty-state__message').text()).toBe('這段期間沒有兌換紀錄喵');
    expect(w.find('.app-page-header .app-button').attributes('disabled')).toBeDefined();
    // The range chips stay, so another range can still be picked
    expect(w.findAll('.app-filter-chip')).toHaveLength(4);
  });
});
