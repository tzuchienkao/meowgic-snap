import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import AppDatePicker from '../../components/app/DatePicker/DatePicker.vue';
import AppButton from '../../components/app/Button/Button.vue';
import AppIconButton from '../../components/app/IconButton/IconButton.vue';

const TODAY = new Date('2026-11-27T10:00:00+08:00');
let wrapper: VueWrapper | undefined;

const mountPicker = (props: Record<string, unknown> = {}) => {
  wrapper = mount(AppDatePicker, {
    props: { min: '2024-11-27', max: '2026-11-27', ...props },
    global: { components: { AppButton, AppIconButton } },
    attachTo: document.body,
  });
  return wrapper;
};
const trigger = (w: VueWrapper) => w.find('.app-date-picker__trigger');
const title = (w: VueWrapper) => w.find('.app-date-picker__title');
const day = (w: VueWrapper, key: string) => w.find(`[data-day="${key}"]`);
const footerButton = (w: VueWrapper, label: string) =>
  w.findAll('.app-date-picker__footer button').find((b) => b.text() === label)!;
const iconButton = (w: VueWrapper, label: string) => w.find(`.app-icon-button[aria-label="${label}"]`);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.useRealTimers();
});

describe('DatePicker', () => {
  it('shows the committed range, or the placeholder, in an Input-style trigger', () => {
    expect(trigger(mountPicker()).text()).toContain('選擇日期');
    wrapper!.unmount();
    const w = mountPicker({ modelValue: { start: '2026-06-01', end: '2026-07-31' }, label: '查詢區間' });
    expect(w.find('.app-date-picker__value').text()).toBe('2026/06/01 – 2026/07/31');
    expect(w.find('.app-date-picker__label').text()).toBe('查詢區間');
    expect(trigger(w).attributes('aria-expanded')).toBe('false');
  });

  it('opens on the start month; today has a dot; days after max are disabled', async () => {
    const w = mountPicker();
    await trigger(w).trigger('click');
    expect(trigger(w).attributes('aria-expanded')).toBe('true');
    expect(w.find('[role="dialog"]').exists()).toBe(true);
    expect(title(w).text()).toContain('2026 年 11 月');
    expect(day(w, '2026-11-27').classes()).toContain('is-today');
    expect(day(w, '2026-11-27').attributes('aria-current')).toBe('date');
    expect(day(w, '2026-11-28').attributes('disabled')).toBeDefined();
    expect(iconButton(w, '下個月').attributes('disabled')).toBeDefined();
  });

  it('first click = start, second = end; the band joins them; 套用 emits and closes', async () => {
    const w = mountPicker({ modelValue: { start: '2026-06-01', end: '2026-06-02' } });
    await trigger(w).trigger('click');
    expect(title(w).text()).toContain('2026 年 6 月');
    await day(w, '2026-06-10').trigger('click');
    expect(day(w, '2026-06-10').classes()).toContain('is-edge');
    // The span hint shows inside the calendar, not under the field
    expect(w.find('.app-date-picker__span-hint').text()).toBe('一次最多查半年喵');
    expect(w.find('.app-date-picker__hint').exists()).toBe(false);
    expect(footerButton(w, '套用').attributes('disabled')).toBeDefined();
    // An earlier day becomes the new start
    await day(w, '2026-06-05').trigger('click');
    await day(w, '2026-06-20').trigger('click');
    expect(w.find('.app-date-picker__span-hint').text()).toBe('');
    expect(day(w, '2026-06-12').element.parentElement!.classList).toContain('is-band');
    expect(day(w, '2026-06-05').element.parentElement!.classList).toContain('is-band-start');
    expect(day(w, '2026-06-20').element.parentElement!.classList).toContain('is-band-end');
    await footerButton(w, '套用').trigger('click');
    expect(w.emitted('update:modelValue')).toEqual([[{ start: '2026-06-05', end: '2026-06-20' }]]);
    expect(w.find('[role="dialog"]').exists()).toBe(false);
  });

  it('while picking, days past start + maxSpanMonths are disabled', async () => {
    const w = mountPicker({ maxSpanMonths: 1 });
    await trigger(w).trigger('click');
    await iconButton(w, '上個月').trigger('click');
    await day(w, '2026-10-05').trigger('click');
    expect(day(w, '2026-10-31').attributes('disabled')).toBeUndefined();
    await iconButton(w, '下個月').trigger('click');
    expect(day(w, '2026-11-05').attributes('disabled')).toBeUndefined();
    expect(day(w, '2026-11-06').attributes('disabled')).toBeDefined();
  });

  it('清除 empties the draft without closing; closing without 套用 keeps the old range', async () => {
    const w = mountPicker({ modelValue: { start: '2026-06-01', end: '2026-06-30' } });
    await trigger(w).trigger('click');
    await footerButton(w, '清除').trigger('click');
    expect(w.find('.is-edge').exists()).toBe(false);
    expect(footerButton(w, '清除').attributes('disabled')).toBeDefined();
    await w.find('[role="dialog"]').trigger('keydown', { key: 'Escape' });
    expect(w.find('[role="dialog"]').exists()).toBe(false);
    expect(w.emitted('update:modelValue')).toBeUndefined();
    expect(w.find('.app-date-picker__value').text()).toBe('2026/06/01 – 2026/06/30');
  });

  it('the title opens a month grid, and its title a year grid (only years with pickable days)', async () => {
    const w = mountPicker();
    await trigger(w).trigger('click');
    await title(w).trigger('click');
    expect(title(w).text()).toContain('2026 年');
    const months = w.findAll('.app-date-picker__choice');
    expect(months).toHaveLength(12);
    expect(months[10]!.classes()).toContain('is-current');
    // December 2026 is after max
    expect(months[11]!.attributes('disabled')).toBeDefined();

    await title(w).trigger('click');
    expect(w.findAll('.app-date-picker__choice').map((c) => c.text())).toEqual(['2024 年', '2025 年', '2026 年']);
    await w.findAll('.app-date-picker__choice')[0]!.trigger('click');
    // 2024: only December is pickable (min 2024-11-27 → November too)
    const months2024 = w.findAll('.app-date-picker__choice');
    expect(months2024[9]!.attributes('disabled')).toBeDefined();
    expect(months2024[10]!.attributes('disabled')).toBeUndefined();
    await months2024[11]!.trigger('click');
    expect(title(w).text()).toContain('2024 年 12 月');
  });

  it('今天 jumps back to this month', async () => {
    const w = mountPicker();
    await trigger(w).trigger('click');
    await title(w).trigger('click');
    await title(w).trigger('click');
    await w.findAll('.app-date-picker__choice')[1]!.trigger('click');
    await w.findAll('.app-date-picker__choice')[2]!.trigger('click');
    expect(title(w).text()).toContain('2025 年 3 月');
    await footerButton(w, '今天').trigger('click');
    expect(title(w).text()).toContain('2026 年 11 月');
  });

  it('keyboard: arrows move by day / week, PageUp by month, within min / max', async () => {
    const w = mountPicker();
    await trigger(w).trigger('click');
    await day(w, '2026-11-20').trigger('keydown', { key: 'ArrowUp' });
    await flushPromises();
    expect(document.activeElement?.getAttribute('data-day')).toBe('2026-11-13');
    await day(w, '2026-11-13').trigger('keydown', { key: 'PageUp' });
    await flushPromises();
    expect(title(w).text()).toContain('2026 年 10 月');
    expect(document.activeElement?.getAttribute('data-day')).toBe('2026-10-13');
    await day(w, '2026-10-13').trigger('keydown', { key: 'PageDown' });
    await day(w, '2026-11-13').trigger('keydown', { key: 'PageDown' });
    await flushPromises();
    expect(document.activeElement?.getAttribute('data-day')).toBe('2026-11-27');
  });

  it('a click outside closes it', async () => {
    const w = mountPicker();
    await trigger(w).trigger('click');
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await w.vm.$nextTick();
    expect(w.find('[role="dialog"]').exists()).toBe(false);
  });

  it('sm sits in a row of chips; without a label, aria-label names it with the range', () => {
    const w = mountPicker({ size: 'sm', ariaLabel: '自訂查詢區間', modelValue: { start: '2026-06-01', end: '2026-06-30' } });
    expect(trigger(w).classes()).toContain('app-date-picker__trigger--sm');
    expect(trigger(w).attributes('aria-label')).toBe('自訂查詢區間：2026/06/01 – 2026/06/30');
    expect(w.find('.app-date-picker__label').exists()).toBe(false);
  });

  it('shows an invalid hint', () => {
    const w = mountPicker({ invalid: true, hint: '只能查 2 年內的紀錄喵' });
    expect(trigger(w).classes()).toContain('is-invalid');
    expect(w.find('.app-date-picker__hint').text()).toBe('只能查 2 年內的紀錄喵');
    expect(w.find('.app-date-picker__hint').attributes('role')).toBe('alert');
  });
});
