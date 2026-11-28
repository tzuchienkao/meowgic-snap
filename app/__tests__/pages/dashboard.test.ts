import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, ref, Suspense } from 'vue';
import AppButton from '../../components/app/Button/Button.vue';
import AppCard from '../../components/app/Card/Card.vue';
import AppCatEarCard from '../../components/app/CatEarCard/CatEarCard.vue';
import AppChip from '../../components/app/Chip/Chip.vue';
import AppDenomCell from '../../components/app/DenomCell/DenomCell.vue';
import AppIllustrationSlot from '../../components/app/IllustrationSlot/IllustrationSlot.vue';
import AppPageHeader from '../../components/app/PageHeader/PageHeader.vue';
import AppEmptyState from '../../components/app/EmptyState/EmptyState.vue';
import AppRecordRow from '../../components/app/RecordRow/RecordRow.vue';
import AppTotalCard from '../../components/app/TotalCard/TotalCard.vue';
import DashboardPage from '../../pages/dashboard.vue';
import { RouteName } from '../../constants/navigation';
import { LogsQuery } from '../../constants/record';
import type { IDashboardData } from '../../types/dashboard';

/** What get_dashboard_summary() returns for a member with records */
const SUMMARY: IDashboardData = {
  totalAmount: 494999,
  startedAt: '2026-06-01T12:00:00+08:00',
  monthlyTotals: [
    { month: '2026-06', total: 72400 },
    { month: '2026-07', total: 107249 },
    { month: '2026-08', total: 88250 },
    { month: '2026-09', total: 130800 },
    { month: '2026-10', total: 96300 },
    { month: '2026-11', total: 0 },
  ],
  denominationTotals: [
    { denomination: 2000, count: 214 },
    { denomination: 1000, count: 38 },
    { denomination: 500, count: 22 },
    { denomination: 200, count: 31 },
    { denomination: 100, count: 47 },
    { denomination: 50, count: 19 },
    { denomination: 10, count: 36 },
    { denomination: 5, count: 12 },
    { denomination: 1, count: 27 },
  ],
  recentRecords: [
    { id: 'r1', name: '10月薪資', createdAt: '2026-10-17T12:00:00+08:00', entryCount: 12, totalAmount: 96300 },
    { id: 'r2', name: '9月薪資', createdAt: '2026-09-16T12:00:00+08:00', entryCount: 12, totalAmount: 94800 },
    { id: 'r3', name: '中秋獎金', createdAt: '2026-09-30T12:00:00+08:00', entryCount: 12, totalAmount: 36000 },
    { id: 'r4', name: '8月薪資', createdAt: '2026-08-15T12:00:00+08:00', entryCount: 11, totalAmount: 88250 },
    { id: 'r5', name: '7月工讀費', createdAt: '2026-07-31T12:00:00+08:00', entryCount: 4, totalAmount: 18999 },
  ],
};

/** ... and for a member without records */
const EMPTY_SUMMARY: IDashboardData = {
  totalAmount: 0,
  startedAt: null,
  monthlyTotals: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].map((month) => ({ month, total: 0 })),
  denominationTotals: [],
  recentRecords: [],
};

let push: ReturnType<typeof vi.fn>;
let rpc: ReturnType<typeof vi.fn>;
let wrapper: VueWrapper | undefined;

/**
 * Like Nuxt's useAsyncData: runs the handler, a thrown error lands in `error` and leaves `data`
 * undefined; `refresh()` runs it again.
 */
const useAsyncDataStub = async <T>(_key: string, handler: () => Promise<T>) => {
  const data = ref<T | undefined>(undefined);
  const error = ref<unknown>(null);
  const status = ref('idle');
  const refresh = async () => {
    try {
      data.value = await handler();
      error.value = null;
      status.value = 'success';
    } catch (e) {
      data.value = undefined;
      error.value = e;
      status.value = 'error';
    }
  };
  await refresh();
  return { data, error, status, refresh };
};

// The page awaits its data in setup, so it needs a Suspense around it
const mountPage = async () => {
  wrapper = mount(defineComponent({ render: () => h(Suspense, null, { default: () => h(DashboardPage) }) }), {
    global: {
      components: { AppButton, AppCard, AppCatEarCard, AppChip, AppDenomCell, AppEmptyState, AppIllustrationSlot, AppPageHeader, AppRecordRow, AppTotalCard },
    },
  });
  await flushPromises();
  return wrapper;
};
const findCard = (w: VueWrapper, title: string) =>
  w.findAll('.app-card').find((card) => card.find('.app-card__title').text() === title)!;

beforeEach(() => {
  push = vi.fn();
  rpc = vi.fn(async () => ({ data: SUMMARY, error: null }));
  vi.stubGlobal('useRouter', () => ({ push }));
  vi.stubGlobal('useNuxtApp', () => ({ $supabase: { rpc } }));
  vi.stubGlobal('useAsyncData', useAsyncDataStub);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.unstubAllGlobals();
});

describe('pages/dashboard.vue', () => {
  it('keeps the title and subtitle', async () => {
    const w = (await mountPage());
    expect(w.find('h1').text()).toBe('儀表板');
    expect(w.find('.app-page-header__description').text()).toBe('喵奴才，這是你到目前為止的兌換紀錄喵');
  });

  it('shows the accumulated total and its start date', async () => {
    const total = (await mountPage()).find('.app-total-card');
    expect(total.classes()).toContain('app-total-card--lg');
    expect(total.find('.app-total-card__label').text()).toBe('累計兌換總金額');
    expect(total.find('.app-total-card__amount-value').text()).toBe('494,999');
    expect(total.find('.total-card__since').text()).toBe('自 2026/06/01 開始累計');
  });

  it('draws the monthly trend with the highest month in accent', async () => {
    const card = findCard((await mountPage()), '每月金額趨勢');
    expect(card.find('.app-card__aside').text()).toBe('近 6 個月');
    expect(card.findAll('.trend-chart__label').map((l) => l.text())).toEqual(['6月', '7月', '8月', '9月', '10月', '11月']);
    expect(card.findAll('.trend-chart__value').map((v) => v.text())).toEqual(['72k', '107k', '88k', '131k', '96k', '—']);
    const bars = card.findAll('.trend-chart__bar');
    expect(bars.map((bar) => bar.classes().includes('trend-chart__bar--max'))).toEqual([false, false, false, true, false, false]);
    expect(bars[3]!.attributes('style')).toContain('height: 150px');
    expect(bars[5]!.attributes('style')).toContain('height: 8px');
    expect(card.find('.trend-chart__value--max').text()).toBe('131k');
  });

  it('splits denomination totals into bills and coins, highlighting the most-used bill', async () => {
    const card = findCard((await mountPage()), '各面額累計');
    expect(card.findAll('.denoms__title').map((t) => t.text())).toEqual(['紙鈔（張）', '硬幣（個）']);
    const bills = card.findAll('.denoms__bills .app-denom-cell');
    expect(bills.map((b) => b.find('.app-denom-cell__value').text())).toEqual(['NT$2,000', 'NT$1,000', 'NT$500', 'NT$200', 'NT$100']);
    expect(bills[0]!.classes()).toEqual(expect.arrayContaining(['app-denom-cell--top', 'app-denom-cell--compact']));
    bills.slice(1).forEach((b) => expect(b.classes()).toContain('app-denom-cell--has'));
    const coins = card.findAll('.denoms__coins .app-denom-cell');
    expect(coins.map((c) => c.find('.app-denom-cell__count').text())).toEqual(['19', '36', '12', '27']);
    coins.forEach((c) => expect(c.classes()).toEqual(expect.arrayContaining(['app-denom-cell--coin', 'bg-soft'])));
  });

  it('lists recent exchanges as rows with formatted date, count and amount', async () => {
    const card = findCard((await mountPage()), '最近幾次兌換');
    const rows = card.findAll('.app-record-row');
    expect(rows).toHaveLength(5);
    expect(rows[0]!.find('.app-record-row__name').text()).toBe('10月薪資');
    expect(rows[0]!.find('.app-record-row__meta').text()).toBe('2026/10/17 · 12 筆');
    expect(rows[0]!.find('.app-record-row__amount').text()).toBe('96,300');
    expect(rows[4]!.find('.app-record-row__amount').text()).toBe('18,999');
    rows.forEach((row) => expect(row.find('.app-record-row__chevron').exists()).toBe(true));
  });

  it('"全部紀錄 ›" goes to the logs page; a record row opens that record there', async () => {
    const card = findCard((await mountPage()), '最近幾次兌換');
    const allButton = card.find('.app-card__aside .app-button');
    expect(allButton.text()).toBe('全部紀錄 ›');
    expect(allButton.classes()).toEqual(expect.arrayContaining(['app-button--secondary', 'app-button--xs']));
    await allButton.trigger('click');
    expect(push).toHaveBeenCalledWith({ name: RouteName.Logs });
    await card.findAll('.app-record-row')[1]!.trigger('click');
    expect(push).toHaveBeenLastCalledWith({
      name: RouteName.Logs,
      query: { [LogsQuery.Record]: 'r2', [LogsQuery.CreatedAt]: '2026-09-16T12:00:00+08:00' },
    });
  });

  it('loads the summary once through get_dashboard_summary()', async () => {
    await mountPage();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('get_dashboard_summary');
  });

  describe('no records yet', () => {
    beforeEach(() => {
      rpc.mockResolvedValue({ data: EMPTY_SUMMARY, error: null });
    });

    it('shows the illustration instead of the cards, keeping the title', async () => {
      const w = await mountPage();
      expect(w.find('h1').text()).toBe('儀表板');
      expect(w.find('.page-dashboard__body').exists()).toBe(false);
      const slot = w.find('.app-cat-ear-card .app-empty-state');
      expect(slot.find('img').exists()).toBe(true);
      // A real illustration: no stripes behind it
      expect(slot.classes()).not.toContain('app-illustration-slot--placeholder');
      expect(slot.find('.app-empty-state__message').text()).toBe('還沒有兌換紀錄喵');
    });

    it('"去首頁算一次" goes to the home page', async () => {
      const buttons = (await mountPage()).findAll('.app-empty-state .app-button');
      expect(buttons.map((b) => b.text())).toEqual(['去首頁算一次']);
      await buttons[0]!.trigger('click');
      expect(push).toHaveBeenCalledWith({ name: RouteName.Index });
    });
  });

  describe('loading fails', () => {
    beforeEach(() => {
      rpc.mockResolvedValueOnce({ data: null, error: new Error('network') });
    });

    it('says so instead of "no records", with only a retry button', async () => {
      const w = await mountPage();
      expect(w.find('.page-dashboard__body').exists()).toBe(false);
      expect(w.find('.app-empty-state__message').text()).toBe('資料沒有載入成功喵');
      expect(w.findAll('.app-empty-state .app-button').map((b) => b.text())).toEqual(['重試']);
    });

    it('重試 loads again and shows the dashboard when it works', async () => {
      const w = await mountPage();
      await w.find('.app-empty-state .app-button').trigger('click');
      await flushPromises();
      expect(rpc).toHaveBeenCalledTimes(2);
      expect(w.find('.app-empty-state').exists()).toBe(false);
      expect(w.find('.app-total-card__amount-value').text()).toBe('494,999');
    });
  });
});
