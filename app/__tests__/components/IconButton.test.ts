import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import IconButton from '../../components/app/IconButton/IconButton.vue';

describe('IconButton (design system)', () => {
  it('uses the label as aria-label and title, glyph hidden from screen readers', () => {
    const w = mount(IconButton, { props: { label: '關閉', glyph: '×' } });
    const b = w.find('button');
    expect(b.attributes('aria-label')).toBe('關閉');
    expect(b.attributes('title')).toBe('關閉');
    expect(b.attributes('type')).toBe('button');
    const glyph = b.find('span[aria-hidden="true"]');
    expect(glyph.text()).toBe('×');
  });

  it('defaults to surface tone, md size', () => {
    const classes = mount(IconButton, { props: { label: 'x', glyph: '☾' } }).find('button').classes();
    expect(classes).toEqual(expect.arrayContaining(['app-icon-button', 'app-icon-button--surface', 'app-icon-button--md']));
  });

  it.each(['surface', 'soft', 'strong'] as const)('applies the %s tone', (tone) => {
    expect(mount(IconButton, { props: { label: 'x', glyph: '☰', tone } }).find('button').classes()).toContain(`app-icon-button--${tone}`);
  });

  it('supports the sm (pagination) size', () => {
    expect(mount(IconButton, { props: { label: '下一頁', glyph: '›', size: 'sm' } }).find('button').classes()).toContain('app-icon-button--sm');
  });

  it('emits click when enabled, not when disabled', async () => {
    const enabled = mount(IconButton, { props: { label: 'x', glyph: '×' } });
    await enabled.find('button').trigger('click');
    expect(enabled.emitted('click')).toHaveLength(1);

    const disabled = mount(IconButton, { props: { label: 'x', glyph: '×', disabled: true } });
    expect(disabled.find('button').attributes('disabled')).toBeDefined();
    await disabled.find('button').trigger('click');
    expect(disabled.emitted('click')).toBeUndefined();
  });
});
