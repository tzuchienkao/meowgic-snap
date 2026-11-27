import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FilterChip from '../../components/app/FilterChip/FilterChip.vue';

describe('FilterChip (design system)', () => {
  it('renders a button with the label, not pressed by default', () => {
    const w = mount(FilterChip, { props: { label: '近 1 個月' } });
    expect(w.element.tagName).toBe('BUTTON');
    expect(w.attributes('type')).toBe('button');
    expect(w.text()).toBe('近 1 個月');
    expect(w.attributes('aria-pressed')).toBe('false');
    expect(w.classes()).not.toContain('app-filter-chip--pressed');
  });

  it('marks the pressed chip', () => {
    const w = mount(FilterChip, { props: { label: '近半年', pressed: true } });
    expect(w.attributes('aria-pressed')).toBe('true');
    expect(w.classes()).toContain('app-filter-chip--pressed');
  });

  it('takes slot content instead of the label, and emits click', async () => {
    const w = mount(FilterChip, { slots: { default: '<b>全部</b>' } });
    expect(w.find('b').text()).toBe('全部');
    await w.trigger('click');
    expect(w.emitted('click')).toHaveLength(1);
  });
});
