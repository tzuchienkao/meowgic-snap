import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Textarea from '../../components/app/Textarea/Textarea.vue';

describe('Textarea (design system)', () => {
  it('renders value, placeholder and 7 rows by default', () => {
    const w = mount(Textarea, { props: { modelValue: '張三,100', placeholder: '張三,18500' } });
    const t = w.find('textarea');
    expect((t.element as HTMLTextAreaElement).value).toBe('張三,100');
    expect(t.attributes('placeholder')).toBe('張三,18500');
    expect(t.attributes('rows')).toBe('7');
    expect(t.classes()).toContain('app-textarea');
  });

  it('emits update:modelValue without trimming (pasted data kept as is)', async () => {
    const w = mount(Textarea);
    await w.find('textarea').setValue('  張三,100\n\n');
    expect(w.emitted('update:modelValue')).toEqual([['  張三,100\n\n']]);
  });

  it('passes readonly, disabled, rows and aria-label through', () => {
    const w = mount(Textarea, { props: { readonly: true, disabled: true, rows: 3 }, attrs: { 'aria-label': '貼上金額資料，每行一筆' } });
    const t = w.find('textarea');
    expect(t.attributes('readonly')).toBeDefined();
    expect(t.attributes('disabled')).toBeDefined();
    expect(t.attributes('rows')).toBe('3');
    expect(t.attributes('aria-label')).toBe('貼上金額資料，每行一筆');
  });
});
