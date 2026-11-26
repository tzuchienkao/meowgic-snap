import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RecordRow from '../../components/app/RecordRow/RecordRow.vue';

const baseProps = { name: '10月薪資', date: '2026/10/17', amount: '96,300' };

describe('RecordRow (design system)', () => {
  it('renders a button with name, date and amount', () => {
    const w = mount(RecordRow, { props: baseProps });
    expect(w.element.tagName).toBe('BUTTON');
    expect(w.attributes('type')).toBe('button');
    expect(w.find('.app-record-row__name').text()).toBe('10月薪資');
    expect(w.find('.app-record-row__meta').text()).toBe('2026/10/17');
    expect(w.find('.app-record-row__amount').text()).toBe('96,300');
  });

  it('appends meta after the date', () => {
    const w = mount(RecordRow, { props: { ...baseProps, meta: '12 筆' } });
    expect(w.find('.app-record-row__meta').text()).toBe('2026/10/17 · 12 筆');
  });

  it('shows a decorative chevron only when asked', () => {
    expect(mount(RecordRow, { props: baseProps }).find('.app-record-row__chevron').exists()).toBe(false);
    const chevron = mount(RecordRow, { props: { ...baseProps, chevron: true } }).find('.app-record-row__chevron');
    expect(chevron.text()).toBe('›');
    expect(chevron.attributes('aria-hidden')).toBe('true');
  });

  it('marks the selected row', () => {
    const plain = mount(RecordRow, { props: baseProps });
    expect(plain.classes()).not.toContain('app-record-row--selected');
    expect(plain.attributes('aria-current')).toBeUndefined();
    const selected = mount(RecordRow, { props: { ...baseProps, selected: true } });
    expect(selected.classes()).toContain('app-record-row--selected');
    expect(selected.attributes('aria-current')).toBe('true');
  });

  it('emits click', async () => {
    const w = mount(RecordRow, { props: baseProps });
    await w.trigger('click');
    expect(w.emitted('click')).toHaveLength(1);
  });
});
