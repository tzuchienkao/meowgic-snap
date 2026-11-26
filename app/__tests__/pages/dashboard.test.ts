import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import AppButton from '../../components/app/Button/Button.vue';
import AppCard from '../../components/app/Card/Card.vue';
import AppCatEarCard from '../../components/app/CatEarCard/CatEarCard.vue';
import AppChip from '../../components/app/Chip/Chip.vue';
import AppDenomCell from '../../components/app/DenomCell/DenomCell.vue';
import AppRecordRow from '../../components/app/RecordRow/RecordRow.vue';
import AppTotalCard from '../../components/app/TotalCard/TotalCard.vue';
import DashboardPage from '../../pages/dashboard.vue';
import { RouteName } from '../../constants/navigation';

let push: ReturnType<typeof vi.fn>;
let wrapper: VueWrapper | undefined;

const mountPage = () => {
  wrapper = mount(DashboardPage, {
    global: {
      components: { AppButton, AppCard, AppCatEarCard, AppChip, AppDenomCell, AppRecordRow, AppTotalCard },
    },
  });
  return wrapper;
};
const findCard = (w: VueWrapper, title: string) =>
  w.findAll('.app-card').find((card) => card.find('.app-card__title').text() === title)!;

beforeEach(() => {
  push = vi.fn();
  vi.stubGlobal('useRouter', () => ({ push }));
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.unstubAllGlobals();
});

describe('pages/dashboard.vue', () => {
  it('keeps the title and subtitle', () => {
    const w = mountPage();
    expect(w.find('h1').text()).toBe('儀表板');
    expect(w.find('.page-settings__header p').text()).toBe('喵奴才，這是你到目前為止的兌換紀錄喵');
  });

  it('shows the accumulated total and its start date', () => {
    const total = mountPage().find('.app-total-card');
    expect(total.classes()).toContain('app-total-card--lg');
    expect(total.find('.app-total-card__label').text()).toBe('累計兌換總金額');
    expect(total.find('.app-total-card__amount-value').text()).toBe('494,999');
    expect(total.find('.total-card__since').text()).toBe('自 2026/06/01 開始累計');
  });

  it('draws the monthly trend with the highest month in accent', () => {
    const card = findCard(mountPage(), '每月金額趨勢');
    expect(card.find('.app-card__aside').text()).toBe('近 6 個月');
    expect(card.findAll('.trend-chart__label').map((l) => l.text())).toEqual(['6月', '7月', '8月', '9月', '10月', '11月']);
    expect(card.findAll('.trend-chart__value').map((v) => v.text())).toEqual(['72k', '107k', '88k', '131k', '96k', '—']);
    const bars = card.findAll('.trend-chart__bar');
    expect(bars.map((bar) => bar.classes().includes('trend-chart__bar--max'))).toEqual([false, false, false, true, false, false]);
    expect(bars[3]!.attributes('style')).toContain('height: 150px');
    expect(bars[5]!.attributes('style')).toContain('height: 8px');
    expect(card.find('.trend-chart__value--max').text()).toBe('131k');
  });

  it('splits denomination totals into bills and coins, highlighting the most-used bill', () => {
    const card = findCard(mountPage(), '各面額累計');
    expect(card.findAll('.denoms__title').map((t) => t.text())).toEqual(['紙鈔（張）', '硬幣（個）']);
    const bills = card.findAll('.denoms__bills .app-denom-cell');
    expect(bills.map((b) => b.find('.app-denom-cell__value').text())).toEqual(['NT$2,000', 'NT$1,000', 'NT$500', 'NT$200', 'NT$100']);
    expect(bills[0]!.classes()).toEqual(expect.arrayContaining(['app-denom-cell--top', 'app-denom-cell--compact']));
    bills.slice(1).forEach((b) => expect(b.classes()).toContain('app-denom-cell--has'));
    const coins = card.findAll('.denoms__coins .app-denom-cell');
    expect(coins.map((c) => c.find('.app-denom-cell__count').text())).toEqual(['19', '36', '12', '27']);
    coins.forEach((c) => expect(c.classes()).toEqual(expect.arrayContaining(['app-denom-cell--coin', 'bg-soft'])));
  });

  it('lists recent exchanges as rows with formatted date, count and amount', () => {
    const card = findCard(mountPage(), '最近幾次兌換');
    const rows = card.findAll('.app-record-row');
    expect(rows).toHaveLength(5);
    expect(rows[0]!.find('.app-record-row__name').text()).toBe('10月薪資');
    expect(rows[0]!.find('.app-record-row__meta').text()).toBe('2026/10/17 · 12 筆');
    expect(rows[0]!.find('.app-record-row__amount').text()).toBe('96,300');
    expect(rows[4]!.find('.app-record-row__amount').text()).toBe('18,999');
    rows.forEach((row) => expect(row.find('.app-record-row__chevron').exists()).toBe(true));
  });

  it('"全部紀錄 ›" and a record row go to the logs page', async () => {
    const card = findCard(mountPage(), '最近幾次兌換');
    const allButton = card.find('.app-card__aside .app-button');
    expect(allButton.text()).toBe('全部紀錄 ›');
    expect(allButton.classes()).toEqual(expect.arrayContaining(['app-button--secondary', 'app-button--xs']));
    await allButton.trigger('click');
    expect(push).toHaveBeenCalledWith({ name: RouteName.Logs });
    await card.find('.app-record-row').trigger('click');
    expect(push).toHaveBeenCalledTimes(2);
  });
});
