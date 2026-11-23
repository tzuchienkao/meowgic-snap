import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Button from '../../components/app/Button/Button.vue';

describe('Button (design system)', () => {
  it('defaults to primary / lg, type="button"', () => {
    const w = mount(Button, { props: { label: '計算' } });
    const b = w.find('button');
    expect(b.attributes('type')).toBe('button');
    expect(b.classes()).toEqual(expect.arrayContaining(['app-button', 'app-button--primary', 'app-button--lg']));
    expect(b.text()).toBe('計算');
  });

  it.each(['primary', 'strong', 'secondary', 'surface', 'outline', 'danger'] as const)('applies the %s variant class', (variant) => {
    const w = mount(Button, { props: { label: 'x', variant } });
    expect(w.find('button').classes()).toContain(`app-button--${variant}`);
  });

  it.each(['lg', 'md', 'sm', 'xs'] as const)('applies the %s size class', (size) => {
    const w = mount(Button, { props: { label: 'x', size } });
    expect(w.find('button').classes()).toContain(`app-button--${size}`);
  });

  it('full adds the full-width class', () => {
    expect(mount(Button, { props: { label: 'x', full: true } }).find('button').classes()).toContain('app-button--full');
    expect(mount(Button, { props: { label: 'x' } }).find('button').classes()).not.toContain('app-button--full');
  });

  it('renders the icon before the label, hidden from screen readers', () => {
    const w = mount(Button, { props: { label: '匯入 CSV', icon: '↑' } });
    const icon = w.find('button > span[aria-hidden="true"]');
    expect(icon.text()).toBe('↑');
    expect(w.find('button').text()).toBe('↑匯入 CSV');
  });

  it('prefers default slot content over the label prop', () => {
    const w = mount(Button, { props: { label: 'fallback' }, slots: { default: '<b>slot</b>' } });
    expect(w.find('button').text()).toBe('slot');
  });

  it('renders the append slot after the label', () => {
    const w = mount(Button, { props: { label: '喵奴才' }, slots: { append: '<span class="caret">▼</span>' } });
    expect(w.find('button').text()).toBe('喵奴才▼');
  });

  it('emits click when enabled', async () => {
    const w = mount(Button, { props: { label: 'x' } });
    await w.find('button').trigger('click');
    expect(w.emitted('click')).toHaveLength(1);
  });

  it('is disabled and does not emit click when disabled', async () => {
    const w = mount(Button, { props: { label: 'x', disabled: true } });
    const b = w.find('button');
    expect(b.attributes('disabled')).toBeDefined();
    await b.trigger('click');
    expect(w.emitted('click')).toBeUndefined();
  });

  it('passes extra classes and attributes through to the button', () => {
    const w = mount(Button, { props: { label: 'x' }, attrs: { class: 'my-extra', 'aria-current': 'page' } });
    expect(w.find('button').classes()).toContain('my-extra');
    expect(w.find('button').attributes('aria-current')).toBe('page');
  });
});
