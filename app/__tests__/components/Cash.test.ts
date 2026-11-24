import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TotalCard from '../../components/app/TotalCard/TotalCard.vue';
import DenomCell from '../../components/app/DenomCell/DenomCell.vue';
import DenomBadge from '../../components/app/DenomBadge/DenomBadge.vue';
import ActionTile from '../../components/app/ActionTile/ActionTile.vue';
import CatEarCard from '../../components/app/CatEarCard/CatEarCard.vue';
import Chip from '../../components/app/Chip/Chip.vue';
import { DenomCellState, DenomKind } from '../../types/denomination';

describe('TotalCard (design system)', () => {
  const global = { components: { AppCatEarCard: CatEarCard, AppChip: Chip } };

  it('is a hero CatEarCard with label, amount and unit (md by default)', () => {
    const w = mount(TotalCard, { props: { amount: '96,300' }, global });
    expect(w.find('.app-cat-ear-card--hero').exists()).toBe(true);
    expect(w.classes()).toContain('app-total-card--md');
    expect(w.find('.app-total-card__label').text()).toBe('總金額');
    expect(w.find('.app-total-card__amount-value').text()).toBe('96,300');
    expect(w.find('.app-total-card__unit').text()).toBe('元');
  });

  it('renders chips as hero Chips, and none when empty', () => {
    const w = mount(TotalCard, { props: { amount: '1', chips: ['總筆數：3 筆', '計算時間 14:32:05'] }, global });
    const chips = w.findAll('.app-total-card__chips .app-chip');
    expect(chips.map((c) => c.text())).toEqual(['總筆數：3 筆', '計算時間 14:32:05']);
    chips.forEach((c) => expect(c.classes()).toContain('app-chip--hero'));
    expect(mount(TotalCard, { props: { amount: '1' }, global }).find('.app-total-card__chips').exists()).toBe(false);
  });

  it('supports custom label/unit, the lg size and slot content', () => {
    const w = mount(TotalCard, {
      props: { amount: '494,999', label: '累計兌換總金額', unit: 'NT$', size: 'lg' },
      slots: { default: '<span class="since">自 2026/06/01 開始累計</span>' },
      global
    });
    expect(w.classes()).toContain('app-total-card--lg');
    expect(w.find('.app-total-card__label').text()).toBe('累計兌換總金額');
    expect(w.find('.app-total-card__unit').text()).toBe('NT$');
    expect(w.find('.since').exists()).toBe(true);
  });
});

describe('DenomBadge (design system)', () => {
  it('reads "NT$面額 N 張" for bills with a thousands separator', () => {
    const w = mount(DenomBadge, { props: { value: 2000, count: 1234 } });
    expect(w.text()).toBe('NT$2,000 1,234 張');
    expect(w.find('.app-denom-badge__count').classes()).toContain('app-denom-badge__count--bill');
  });

  it('uses 個 and the coin chip for values under 100', () => {
    const w = mount(DenomBadge, { props: { value: 50, count: 3 } });
    expect(w.text()).toBe('NT$50 3 個');
    expect(w.find('.app-denom-badge__count').classes()).toContain('app-denom-badge__count--coin');
  });

  it('treats 100 as a bill (boundary)', () => {
    expect(mount(DenomBadge, { props: { value: 100, count: 1 } }).text()).toBe('NT$100 1 張');
  });

  it('kind overrides the inferred type', () => {
    expect(mount(DenomBadge, { props: { value: 50, count: 2, kind: DenomKind.Bill } }).text()).toBe('NT$50 2 張');
  });

  it('never renders ×N', () => {
    expect(mount(DenomBadge, { props: { value: 1000, count: 20 } }).text()).not.toContain('×');
  });

  it('defaults to sm on a white pill; supports md and the soft pill', () => {
    expect(mount(DenomBadge, { props: { value: 1, count: 1 } }).classes()).toEqual(
      expect.arrayContaining(['app-denom-badge--sm', 'app-denom-badge--on-surface'])
    );
    expect(mount(DenomBadge, { props: { value: 1, count: 1, size: 'md', onSurface: false } }).classes()).toEqual(
      expect.arrayContaining(['app-denom-badge--md', 'app-denom-badge--on-soft'])
    );
  });
});

describe('DenomCell (design system)', () => {
  it('bill: NT$ value, count and 張; state defaults to has / zero from count', () => {
    const has = mount(DenomCell, { props: { value: 2000, count: 9 } });
    expect(has.find('.app-denom-cell__value').text()).toBe('NT$2,000');
    expect(has.find('.app-denom-cell__count').text()).toBe('9');
    expect(has.find('.app-denom-cell__unit').text()).toBe('張');
    expect(has.classes()).toEqual(expect.arrayContaining(['app-denom-cell--bill', 'app-denom-cell--has']));

    expect(mount(DenomCell, { props: { value: 500, count: 0 } }).classes()).toContain('app-denom-cell--zero');
  });

  it('explicit top state (most-used bill)', () => {
    expect(mount(DenomCell, { props: { value: 2000, count: 214, state: DenomCellState.Top } }).classes()).toContain('app-denom-cell--top');
  });

  it('formats large counts with separators', () => {
    expect(mount(DenomCell, { props: { value: 1000, count: 12345 } }).find('.app-denom-cell__count').text()).toBe('12,345');
  });

  it('compact bills drop the 張 unit', () => {
    const w = mount(DenomCell, { props: { value: 1000, count: 38, compact: true } });
    expect(w.classes()).toContain('app-denom-cell--compact');
    expect(w.find('.app-denom-cell__unit').exists()).toBe(false);
  });

  it('coins never show a unit and support the zero state', () => {
    const coin = mount(DenomCell, { props: { kind: DenomKind.Coin, value: 5, count: 0 } });
    expect(coin.classes()).toEqual(expect.arrayContaining(['app-denom-cell--coin', 'app-denom-cell--zero']));
    expect(coin.find('.app-denom-cell__value').text()).toBe('NT$5');
    expect(coin.find('.app-denom-cell__unit').exists()).toBe(false);
  });
});

describe('ActionTile (design system)', () => {
  it('renders a button with a decorative glyph and a label', () => {
    const w = mount(ActionTile, { props: { glyph: '⧉', label: '複製領款單' } });
    const b = w.find('button');
    expect(b.attributes('type')).toBe('button');
    expect(b.find('.app-action-tile__glyph').attributes('aria-hidden')).toBe('true');
    expect(b.find('.app-action-tile__label').text()).toBe('複製領款單');
  });

  it('emits click when enabled, not when disabled', async () => {
    const on = mount(ActionTile, { props: { glyph: '↓', label: '匯出 CSV' } });
    await on.find('button').trigger('click');
    expect(on.emitted('click')).toHaveLength(1);

    const off = mount(ActionTile, { props: { glyph: '↓', label: '匯出 CSV', disabled: true } });
    expect(off.find('button').attributes('disabled')).toBeDefined();
    await off.find('button').trigger('click');
    expect(off.emitted('click')).toBeUndefined();
  });
});
