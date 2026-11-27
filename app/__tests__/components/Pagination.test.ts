import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Pagination from '../../components/app/Pagination/Pagination.vue';

const pageLabels = (w: ReturnType<typeof mount>) => w.findAll('.app-pagination__page').map((b) => b.text());
const step = (w: ReturnType<typeof mount>, label: string) => w.find(`[aria-label="${label}"]`);

describe('Pagination (design system)', () => {
  it('is a labelled nav with the caption', () => {
    const w = mount(Pagination, { props: { page: 1, pages: 3, caption: '第 1–50 筆，共 128 筆' } });
    expect(w.element.tagName).toBe('NAV');
    expect(w.attributes('aria-label')).toBe('分頁');
    expect(w.find('.app-pagination__caption').text()).toBe('第 1–50 筆，共 128 筆');
    expect(mount(Pagination, { props: { page: 1, pages: 3 } }).find('.app-pagination__caption').exists()).toBe(false);
  });

  it('shows up to two pages on each side of the current one, which is marked', () => {
    expect(pageLabels(mount(Pagination, { props: { page: 1, pages: 3 } }))).toEqual(['1', '2', '3']);
    const w = mount(Pagination, { props: { page: 5, pages: 10 } });
    expect(pageLabels(w)).toEqual(['3', '4', '5', '6', '7']);
    const current = w.find('.app-pagination__page--current');
    expect(current.text()).toBe('5');
    expect(current.attributes('aria-current')).toBe('page');
    expect(current.attributes('aria-label')).toBe('第 5 頁');
    expect(w.findAll('[aria-current="page"]')).toHaveLength(1);
  });

  it('disables 上一頁 on the first page and 下一頁 on the last', () => {
    const first = mount(Pagination, { props: { page: 1, pages: 3 } });
    expect(step(first, '上一頁').attributes('disabled')).toBeDefined();
    expect(step(first, '下一頁').attributes('disabled')).toBeUndefined();
    const last = mount(Pagination, { props: { page: 3, pages: 3 } });
    expect(step(last, '下一頁').attributes('disabled')).toBeDefined();
    const only = mount(Pagination, { props: { page: 1, pages: 1 } });
    expect(step(only, '上一頁').attributes('disabled')).toBeDefined();
    expect(step(only, '下一頁').attributes('disabled')).toBeDefined();
  });

  it('emits change with the clicked or stepped page, never the current one', async () => {
    const w = mount(Pagination, { props: { page: 2, pages: 3 } });
    await step(w, '下一頁').trigger('click');
    await step(w, '上一頁').trigger('click');
    await w.find('[aria-label="第 3 頁"]').trigger('click');
    await w.find('[aria-label="第 2 頁"]').trigger('click');
    expect(w.emitted('change')).toEqual([[3], [1], [3]]);
  });
});
