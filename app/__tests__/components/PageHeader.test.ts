import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppPageHeader from '../../components/app/PageHeader/PageHeader.vue';
import AppEmptyState from '../../components/app/EmptyState/EmptyState.vue';
import AppIllustrationSlot from '../../components/app/IllustrationSlot/IllustrationSlot.vue';

describe('AppPageHeader', () => {
  it('renders the title as the page h1 and the description under it', () => {
    const w = mount(AppPageHeader, { props: { title: '紀錄', description: '紀錄保存 2 年' } });
    expect(w.find('h1').text()).toBe('紀錄');
    expect(w.find('.app-page-header__description').text()).toBe('紀錄保存 2 年');
  });

  it('no description → no empty paragraph', () => {
    const w = mount(AppPageHeader, { props: { title: '設定' } });
    expect(w.find('p').exists()).toBe(false);
  });

  it('renders actions at the end of the row', () => {
    const w = mount(AppPageHeader, { props: { title: '紀錄' }, slots: { actions: '<button>匯出</button>' } });
    expect(w.find('.app-page-header > button').text()).toBe('匯出');
  });
});

describe('AppEmptyState', () => {
  const mountEmpty = (props: { message: string; label?: string }, slots = {}) =>
    mount(AppEmptyState, { props, slots, global: { components: { AppIllustrationSlot } } });

  it('shows the illustration, the message and the actions in that order', () => {
    const w = mountEmpty({ message: '還沒有兌換紀錄喵' }, { default: '<img alt="貓">', actions: '<button>去首頁</button>' });
    const children = w.find('.app-empty-state').element.children;
    expect([...children].map((el) => el.tagName)).toEqual(['IMG', 'P', 'BUTTON']);
    expect(w.find('.app-empty-state__message').text()).toBe('還沒有兌換紀錄喵');
  });

  it('label → striped placeholder with the label; none → no stripes', () => {
    const placeholder = mountEmpty({ message: '沒有紀錄', label: '貓咪插畫：翻開空白的紀錄本' });
    expect(placeholder.find('.app-illustration-slot--placeholder').exists()).toBe(true);
    expect(placeholder.find('.app-illustration-slot__label').text()).toBe('貓咪插畫：翻開空白的紀錄本');
    expect(placeholder.find('.app-empty-state').attributes('style')).toContain('--stripe: 10px');

    expect(mountEmpty({ message: '沒有紀錄' }).find('.app-illustration-slot--placeholder').exists()).toBe(false);
  });
});
