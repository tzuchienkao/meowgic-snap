import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Checkbox from '../../components/app/Checkbox/Checkbox.vue';

describe('Checkbox (design system)', () => {
  it('is a button with role="checkbox" and aria-checked', () => {
    const off = mount(Checkbox, { props: { label: 'NT$2,000' } }).find('button');
    expect(off.attributes('type')).toBe('button');
    expect(off.attributes('role')).toBe('checkbox');
    expect(off.attributes('aria-checked')).toBe('false');

    const on = mount(Checkbox, { props: { label: 'NT$2,000', modelValue: true } }).find('button');
    expect(on.attributes('aria-checked')).toBe('true');
    expect(on.classes()).toContain('is-checked');
  });

  it('shows ✓ only when checked; the box is hidden from screen readers', () => {
    const off = mount(Checkbox, { props: { label: 'x' } });
    const on = mount(Checkbox, { props: { label: 'x', modelValue: true } });
    expect(off.find('.app-checkbox__box').text()).toBe('');
    expect(on.find('.app-checkbox__box').text()).toBe('✓');
    expect(on.find('.app-checkbox__box').attributes('aria-hidden')).toBe('true');
  });

  it('emits the toggled value on click', async () => {
    const off = mount(Checkbox, { props: { label: 'x' } });
    await off.find('button').trigger('click');
    expect(off.emitted('update:modelValue')).toEqual([[true]]);

    const on = mount(Checkbox, { props: { label: 'x', modelValue: true } });
    await on.find('button').trigger('click');
    expect(on.emitted('update:modelValue')).toEqual([[false]]);
  });

  it('does not emit when disabled', async () => {
    const w = mount(Checkbox, { props: { label: 'x', disabled: true } });
    expect(w.find('button').attributes('disabled')).toBeDefined();
    await w.find('button').trigger('click');
    expect(w.emitted('update:modelValue')).toBeUndefined();
  });

  it('renders label and note', () => {
    const w = mount(Checkbox, { props: { label: 'NT$1', note: '（建議保留）' } });
    expect(w.find('.app-checkbox__label').text()).toBe('NT$1');
    expect(w.find('.app-checkbox__note').text()).toBe('（建議保留）');
  });

  it('accepts slot content as the label', () => {
    const w = mount(Checkbox, { slots: { default: '資料包含<b>姓名</b>和金額' } });
    expect(w.find('.app-checkbox__label').text()).toBe('資料包含姓名和金額');
  });

  it('defaults to md / round and supports sm / sans', () => {
    expect(mount(Checkbox).find('button').classes()).toEqual(expect.arrayContaining(['app-checkbox--md', 'app-checkbox--round']));
    expect(mount(Checkbox, { props: { size: 'sm', labelFont: 'sans' } }).find('button').classes()).toEqual(expect.arrayContaining(['app-checkbox--sm', 'app-checkbox--sans']));
  });
});
