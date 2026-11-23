import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Input from '../../components/app/Input/Input.vue';

describe('Input (design system)', () => {
  it('wraps the field in a <label> so the label text is associated with the input', () => {
    const w = mount(Input, { props: { label: '個人名稱' } });
    expect(w.element.tagName).toBe('LABEL');
    expect(w.find('.app-input__label').text()).toBe('個人名稱');
    expect(w.find('label input').exists()).toBe(true);
  });

  it('omits the label and meta row when not provided', () => {
    const w = mount(Input);
    expect(w.find('.app-input__label').exists()).toBe(false);
    expect(w.find('.app-input__meta').exists()).toBe(false);
  });

  it('renders value, type and placeholder', () => {
    const w = mount(Input, { props: { modelValue: 'a@b.test', type: 'email', placeholder: 'example@mail.com' } });
    const input = w.find('input');
    expect((input.element as HTMLInputElement).value).toBe('a@b.test');
    expect(input.attributes('type')).toBe('email');
    expect(input.attributes('placeholder')).toBe('example@mail.com');
  });

  it('emits update:modelValue on input', async () => {
    const w = mount(Input);
    await w.find('input').setValue('喵奴才');
    expect(w.emitted('update:modelValue')).toEqual([['喵奴才']]);
  });

  it('keeps the existing trimming behaviour (surrounding spaces trimmed, whitespace-only kept)', async () => {
    const w = mount(Input);
    await w.find('input').setValue('  喵奴才  ');
    await w.find('input').setValue('   ');
    expect(w.emitted('update:modelValue')).toEqual([['喵奴才'], ['   ']]);
  });

  it('emits blur', async () => {
    const w = mount(Input);
    await w.find('input').trigger('blur');
    expect(w.emitted('blur')).toHaveLength(1);
  });

  it('shows hint on the left and count on the right', () => {
    const w = mount(Input, { props: { hint: '顯示在右上角', count: '4 / 20' } });
    const spans = w.findAll('.app-input__meta > span');
    expect(spans.map((s) => s.text())).toEqual(['顯示在右上角', '4 / 20']);
  });

  it('invalid sets aria-invalid and warn classes on field and meta', () => {
    const w = mount(Input, { props: { invalid: true, hint: '最多 5 個字', count: '6 / 5' } });
    expect(w.find('input').attributes('aria-invalid')).toBe('true');
    expect(w.find('input').classes()).toContain('is-invalid');
    expect(w.find('.app-input__meta').classes()).toContain('is-invalid');
  });

  it('links the hint to the field with aria-describedby (only when there is a hint)', () => {
    const w = mount(Input, { props: { hint: '信箱格式不對喵', invalid: true } });
    const describedBy = w.find('input').attributes('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(w.find(`[id="${describedBy}"]`).text()).toBe('信箱格式不對喵');
    expect(mount(Input).find('input').attributes('aria-describedby')).toBeUndefined();
  });

  it('valid has no aria-invalid', () => {
    expect(mount(Input).find('input').attributes('aria-invalid')).toBeUndefined();
  });

  it('readonly and disabled reach the input', () => {
    expect(mount(Input, { props: { readonly: true } }).find('input').attributes('readonly')).toBeDefined();
    expect(mount(Input, { props: { disabled: true } }).find('input').attributes('disabled')).toBeDefined();
  });

  it('renders the trailing slot next to the field', () => {
    const w = mount(Input, { slots: { trailing: '<button class="save">儲存</button>' } });
    expect(w.find('.app-input__row .save').text()).toBe('儲存');
  });

  it('passes extra attributes to the <input> and class to the root', () => {
    const w = mount(Input, { attrs: { class: 'extra', autocomplete: 'email', name: 'email' } });
    expect(w.classes()).toContain('extra');
    expect(w.find('input').attributes('autocomplete')).toBe('email');
    expect(w.find('input').attributes('name')).toBe('email');
    expect(w.find('input').classes()).not.toContain('extra');
  });
});
