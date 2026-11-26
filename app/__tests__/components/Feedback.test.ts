import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Chip from '../../components/app/Chip/Chip.vue';
import Alert from '../../components/app/Alert/Alert.vue';
import Toast from '../../components/app/Toast/Toast.vue';
import IllustrationSlot from '../../components/app/IllustrationSlot/IllustrationSlot.vue';
import IconButton from '../../components/app/IconButton/IconButton.vue';

describe('Chip (design system)', () => {
  it('renders a soft, non-interactive pill by default', () => {
    const w = mount(Chip, { slots: { default: '已貼 3 / 1,000 筆' } });
    expect(w.element.tagName).toBe('SPAN');
    expect(w.classes()).toEqual(expect.arrayContaining(['app-chip', 'app-chip--soft']));
    expect(w.text()).toBe('已貼 3 / 1,000 筆');
    expect(w.find('button').exists()).toBe(false);
  });

  it.each(['soft', 'surface', 'warn', 'hero', 'accent'] as const)('applies the %s tone', (tone) => {
    expect(mount(Chip, { props: { tone } }).classes()).toContain(`app-chip--${tone}`);
  });
});

describe('Alert (design system)', () => {
  const global = { components: { AppIconButton: IconButton } };

  it('warn (default) is role="alert" with title and body', () => {
    const w = mount(Alert, { props: { title: '喵？有幾行看不懂 (ΦдΦ)' }, slots: { default: '<div class="line">第 1 行「a」少了逗號</div>' }, global });
    expect(w.attributes('role')).toBe('alert');
    expect(w.classes()).toContain('app-alert--warn');
    expect(w.find('.app-alert__title').text()).toBe('喵？有幾行看不懂 (ΦдΦ)');
    expect(w.find('.line').text()).toBe('第 1 行「a」少了逗號');
  });

  it('warn without a title renders no title line', () => {
    const w = mount(Alert, { slots: { default: '太多了喵' }, global });
    expect(w.find('.app-alert__title').exists()).toBe(false);
    expect(w.text()).toBe('太多了喵');
  });

  it('accepts a title slot', () => {
    const w = mount(Alert, { slots: { title: '<span>自訂</span>', default: 'x' }, global });
    expect(w.find('.app-alert__title').text()).toBe('自訂');
  });

  it('success is role="status" with a decorative ✓ and no close button by default', () => {
    const w = mount(Alert, { props: { tone: 'success' }, slots: { default: '名稱存好了喵' }, global });
    expect(w.attributes('role')).toBe('status');
    expect(w.classes()).toContain('app-alert--success');
    expect(w.find('.app-alert__check').attributes('aria-hidden')).toBe('true');
    expect(w.find('.app-alert__message').text()).toBe('名稱存好了喵');
    expect(w.find('button').exists()).toBe(false);
  });

  it('success with closable shows a labelled × that emits close', async () => {
    const w = mount(Alert, { props: { tone: 'success', closable: true }, slots: { default: 'ok' }, global });
    const close = w.find('button');
    expect(close.attributes('aria-label')).toBe('關閉提示');
    await close.trigger('click');
    expect(w.emitted('close')).toHaveLength(1);
  });
});

describe('Toast (design system)', () => {
  it('is a polite live region with the message', () => {
    const w = mount(Toast, { slots: { default: '領款單已複製，可以貼給銀行了喵' } });
    expect(w.attributes('role')).toBe('status');
    expect(w.attributes('aria-live')).toBe('polite');
    expect(w.text()).toBe('領款單已複製，可以貼給銀行了喵');
    expect(w.classes()).not.toContain('app-toast--fixed');
  });

  it('fixed positions it bottom-centre', () => {
    expect(mount(Toast, { props: { fixed: true } }).classes()).toContain('app-toast--fixed');
  });
});

describe('IllustrationSlot (design system)', () => {
  it('shows the label and slot content', () => {
    const w = mount(IllustrationSlot, { props: { label: '貓咪插畫：緊抓帳本不放' }, slots: { default: '<p class="msg">算好的結果會出現在這裡喵</p>' } });
    expect(w.find('.app-illustration-slot__label').text()).toBe('貓咪插畫：緊抓帳本不放');
    expect(w.find('.msg').exists()).toBe(true);
  });

  it('defaults to an 8px stripe and tile radius', () => {
    const w = mount(IllustrationSlot, { props: { label: 'x' } });
    expect(w.attributes('style')).toContain('--stripe: 8px');
    expect(w.classes()).toContain('app-illustration-slot--tile');
  });

  it('accepts stripe width and card radius', () => {
    const w = mount(IllustrationSlot, { props: { label: 'x', stripe: 10, radius: 'card' } });
    expect(w.attributes('style')).toContain('--stripe: 10px');
    expect(w.classes()).toContain('app-illustration-slot--card');
  });

  it('shows the stripes only as a placeholder (with a label)', () => {
    expect(mount(IllustrationSlot, { props: { label: 'x' } }).classes()).toContain('app-illustration-slot--placeholder');
    const withImage = mount(IllustrationSlot, { props: { stripe: 10 }, slots: { default: '<img alt="貓咪插畫" />' } });
    expect(withImage.classes()).not.toContain('app-illustration-slot--placeholder');
    expect(withImage.attributes('style')).toBeUndefined();
  });
});
