import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Card from '../../components/app/Card/Card.vue';
import CatEarCard from '../../components/app/CatEarCard/CatEarCard.vue';

describe('Card (design system)', () => {
  it('defaults to surface tone and main radius, renders the default slot', () => {
    const w = mount(Card, { slots: { default: '<p class="content">內容</p>' } });
    expect(w.classes()).toEqual(expect.arrayContaining(['app-card', 'app-card--surface', 'app-card--main']));
    expect(w.find('.content').text()).toBe('內容');
  });

  it('has no header when there is no title or aside', () => {
    expect(mount(Card).find('.app-card__header').exists()).toBe(false);
  });

  it('renders the title prop and aside slot in the header', () => {
    const w = mount(Card, { props: { title: '每月金額趨勢' }, slots: { aside: '近 6 個月' } });
    expect(w.find('.app-card__title').text()).toBe('每月金額趨勢');
    expect(w.find('.app-card__aside').text()).toBe('近 6 個月');
  });

  it('accepts a title slot instead of the prop', () => {
    const w = mount(Card, { slots: { title: '<strong>自訂標題</strong>' } });
    expect(w.find('.app-card__title').text()).toBe('自訂標題');
  });

  it('renders the header with only an aside', () => {
    const w = mount(Card, { slots: { aside: '<button>全部紀錄 ›</button>' } });
    expect(w.find('.app-card__header').exists()).toBe(true);
    expect(w.find('.app-card__aside button').text()).toBe('全部紀錄 ›');
  });

  it.each(['surface', 'soft', 'hero'] as const)('applies the %s tone', (tone) => {
    expect(mount(Card, { props: { tone } }).classes()).toContain(`app-card--${tone}`);
  });

  it('applies the sub radius', () => {
    expect(mount(Card, { props: { radius: 'sub' } }).classes()).toContain('app-card--sub');
  });
});

describe('CatEarCard (design system)', () => {
  it('renders two decorative ears and the body slot', () => {
    const w = mount(CatEarCard, { slots: { default: '<p class="content">內容</p>' } });
    const ears = w.findAll('.app-cat-ear-card__ear');
    expect(ears).toHaveLength(2);
    ears.forEach((ear) => expect(ear.attributes('aria-hidden')).toBe('true'));
    expect(w.find('.app-cat-ear-card__body .content').text()).toBe('內容');
  });

  it('defaults to the surface tone', () => {
    expect(mount(CatEarCard).classes()).toContain('app-cat-ear-card--surface');
  });

  it('supports the hero tone (dark total card)', () => {
    expect(mount(CatEarCard, { props: { tone: 'hero' } }).classes()).toContain('app-cat-ear-card--hero');
  });

  it('passes extra classes through to the root', () => {
    expect(mount(CatEarCard, { attrs: { class: 'relative z-1' } }).classes()).toEqual(expect.arrayContaining(['relative', 'z-1']));
  });
});
