import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppButton from '../../components/app/Button/Button.vue';
import AppDenomBadge from '../../components/app/DenomBadge/DenomBadge.vue';
import RecordDetailCard from '../../components/app/RecordDetailCard/RecordDetailCard.vue';

const baseProps = {
  name: '11月薪資',
  date: '2026/11/20',
  count: 3,
  amount: '37,187',
  breakdown: [
    { denomination: 1000, count: 37 },
    { denomination: 100, count: 1 },
    { denomination: 1, count: 2 },
  ],
};
const mountCard = (props: Record<string, unknown> = {}) =>
  mount(RecordDetailCard, { props: { ...baseProps, ...props }, global: { components: { AppButton, AppDenomBadge } } });

describe('RecordDetailCard (design system)', () => {
  it('has two cat ears and a head button with the name, date and count', () => {
    const w = mountCard();
    expect(w.findAll('.app-record-detail-card__ear')).toHaveLength(2);
    w.findAll('.app-record-detail-card__ear').forEach((ear) => expect(ear.attributes('aria-hidden')).toBe('true'));
    const head = w.find('.app-record-detail-card__head');
    expect(head.element.tagName).toBe('BUTTON');
    expect(head.attributes('type')).toBe('button');
    expect(head.find('.app-record-detail-card__name').text()).toBe('11月薪資');
    expect(head.find('.app-record-detail-card__meta').text()).toBe('2026/11/20 · 3 筆');
  });

  it('open (default): the total with its format, and the cash breakdown on the inset panel', () => {
    const w = mountCard();
    expect(w.classes()).toContain('app-record-detail-card--open');
    expect(w.find('.app-record-detail-card__head').attributes('aria-expanded')).toBe('true');
    // One ▼ glyph, turned to point up while open (CSS)
    expect(w.find('.app-record-detail-card__chevron').text()).toBe('▼');
    const panel = w.find('.app-record-detail-card__panel');
    expect(panel.attributes('inert')).toBeUndefined();
    expect(panel.attributes('aria-hidden')).toBeUndefined();
    expect(w.find('.app-record-detail-card__head-amount').exists()).toBe(false);
    expect(w.find('.app-record-detail-card__format').text()).toBe('姓名＋金額 · 合計');
    expect(w.find('.app-record-detail-card__amount').text()).toBe('37,187元');
    expect(w.find('.app-record-detail-card__cash-title').text()).toBe('這次要準備的現金');
    const badges = w.findAll('.app-denom-badge');
    expect(badges.map((b) => b.find('.app-denom-badge__value').text())).toEqual(['NT$1,000', 'NT$100', 'NT$1']);
    badges.forEach((b) => expect(b.classes()).toContain('app-denom-badge--md'));
  });

  it('takes another format label', () => {
    expect(mountCard({ format: '純金額' }).find('.app-record-detail-card__format').text()).toBe('純金額 · 合計');
  });

  it('collapsed: the head only, with the amount; the detail stays rendered (to slide) but inert', () => {
    const w = mountCard({ open: false });
    expect(w.classes()).not.toContain('app-record-detail-card--open');
    expect(w.find('.app-record-detail-card__head').attributes('aria-expanded')).toBe('false');
    expect(w.find('.app-record-detail-card__head-amount').text()).toBe('37,187');
    const panel = w.find('.app-record-detail-card__panel');
    expect(panel.find('.app-record-detail-card__cash').exists()).toBe(true);
    expect(panel.attributes('inert')).toBeDefined();
    expect(panel.attributes('aria-hidden')).toBe('true');
    // The ears stay: still the selected record
    expect(w.findAll('.app-record-detail-card__ear')).toHaveLength(2);
  });

  it('opening and closing changes only the panel state (the slide is CSS)', async () => {
    const w = mountCard({ open: false });
    await w.setProps({ open: true });
    expect(w.classes()).toContain('app-record-detail-card--open');
    expect(w.find('.app-record-detail-card__panel').attributes('inert')).toBeUndefined();
    expect(w.find('.app-record-detail-card__head-amount').exists()).toBe(false);
  });

  it('emits toggle, rename and export', async () => {
    const w = mountCard();
    await w.find('.app-record-detail-card__head').trigger('click');
    await w.find('.app-record-detail-card__rename').trigger('click');
    await w.find('.app-record-detail-card__cash .app-button').trigger('click');
    expect(w.emitted('toggle')).toHaveLength(1);
    expect(w.emitted('rename')).toHaveLength(1);
    expect(w.emitted('export')).toHaveLength(1);
    expect(w.find('.app-record-detail-card__cash .app-button').text()).toContain('匯出這筆 CSV');
  });
});
