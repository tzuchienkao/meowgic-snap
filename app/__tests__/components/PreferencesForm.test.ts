import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { ref, type Ref } from 'vue';
import AppButton from '../../components/app/Button/Button.vue';
import AppCheckbox from '../../components/app/Checkbox/Checkbox.vue';
import PreferencesForm from '../../components/app/PreferencesForm/PreferencesForm.vue';

let store: Record<string, Ref<unknown>>;
const useStateStub = <T>(key: string, init: () => T) => {
  if (!store[key]) store[key] = ref(init());
  return store[key] as Ref<T>;
};
let userRef: Ref<{ id: string } | null>;

const mountForm = (props: Record<string, unknown> = {}) =>
  mount(PreferencesForm, { props, global: { components: { AppButton, AppCheckbox } } });

const checkbox = (wrapper: VueWrapper, label: string) => {
  const found = wrapper.findAll('[role="checkbox"]').find((c) => c.find('.app-checkbox__label').text() === label);
  expect(found, label).toBeDefined();
  return found!;
};
const group = (wrapper: VueWrapper, title: string) => wrapper.find(`section[aria-label="${title}"]`);
const isChecked = (el: { attributes: (name: string) => string | undefined }) => el.attributes('aria-checked') === 'true';
const saved = () => JSON.parse(localStorage.getItem('preferences') ?? 'null');

describe('PreferencesForm', () => {
  beforeEach(() => {
    store = {};
    userRef = ref(null);
    localStorage.clear();
    vi.stubGlobal('useState', useStateStub);
    vi.stubGlobal('useAuth', () => ({ user: userRef }));
    vi.stubGlobal('useToast', () => ({ showToast: vi.fn() }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('stacked (guest drawer) adds the stacked modifier and puts the note under the label', () => {
    const stacked = mountForm({ stacked: true });
    expect(stacked.classes()).toContain('app-preferences-form--stacked');
    expect(stacked.find('.app-preferences-form__format .app-checkbox').classes()).toContain('app-checkbox--note-below');
    const inline = mountForm();
    expect(inline.classes()).not.toContain('app-preferences-form--stacked');
    expect(inline.find('.app-preferences-form__format .app-checkbox').classes()).not.toContain('app-checkbox--note-below');
  });

  it('renders the format row with its note and the CSV 範例 button', () => {
    const wrapper = mountForm();
    const format = checkbox(wrapper, '資料包含姓名和金額');
    expect(isChecked(format)).toBe(true);
    expect(format.find('.app-checkbox__note').text()).toBe('（取消勾選只支援純金額）');
    expect(format.classes()).toContain('app-checkbox--sans');
    const sample = wrapper.find('.app-preferences-form__sample');
    expect(sample.text()).toContain('CSV 範例');
    expect(sample.classes()).toEqual(expect.arrayContaining(['app-button--surface', 'app-button--sm']));
  });

  it('renders 面額設定 with 紙鈔 and 硬幣 groups, labels and the NT$1 note', () => {
    const wrapper = mountForm();
    expect(wrapper.find('.app-preferences-form__title').text()).toBe('面額設定');
    const labels = (title: string) =>
      group(wrapper, title).findAll('[role="checkbox"] .app-checkbox__label').map((l) => l.text());
    expect(labels('紙鈔')).toEqual(['全選', 'NT$2,000', 'NT$1,000', 'NT$500', 'NT$200', 'NT$100']);
    expect(labels('硬幣')).toEqual(['全選', 'NT$50', 'NT$20', 'NT$10', 'NT$5', 'NT$1']);
    expect(checkbox(wrapper, 'NT$1').find('.app-checkbox__note').text()).toBe('（建議保留）');
    expect(checkbox(wrapper, 'NT$5').find('.app-checkbox__note').exists()).toBe(false);
  });

  it('checks the default denominations; 全選 is off when a group is incomplete', () => {
    const wrapper = mountForm();
    expect(isChecked(checkbox(wrapper, 'NT$1,000'))).toBe(true);
    expect(isChecked(checkbox(wrapper, 'NT$2,000'))).toBe(false);
    expect(isChecked(checkbox(wrapper, 'NT$20'))).toBe(false);
    expect(isChecked(group(wrapper, '紙鈔').findAll('[role="checkbox"]')[0]!)).toBe(false);
    expect(isChecked(group(wrapper, '硬幣').findAll('[role="checkbox"]')[0]!)).toBe(false);
  });

  it('toggling a denomination updates the state and saves it', async () => {
    const wrapper = mountForm();
    await checkbox(wrapper, 'NT$20').trigger('click');
    expect(isChecked(checkbox(wrapper, 'NT$20'))).toBe(true);
    expect(saved().denominations).toEqual([1000, 500, 100, 50, 20, 10, 5, 1]);

    await checkbox(wrapper, 'NT$1').trigger('click');
    expect(isChecked(checkbox(wrapper, 'NT$1'))).toBe(false);
    expect(saved().denominations).toEqual([1000, 500, 100, 50, 20, 10, 5]);
  });

  it('unchecking the format checkbox switches to amount-only', async () => {
    const wrapper = mountForm();
    await checkbox(wrapper, '資料包含姓名和金額').trigger('click');
    expect(isChecked(checkbox(wrapper, '資料包含姓名和金額'))).toBe(false);
    expect(saved().includesNames).toBe(false);
  });

  it('全選 turns the whole group on and reflects when every item is on', async () => {
    const wrapper = mountForm();
    const billsAll = () => group(wrapper, '紙鈔').findAll('[role="checkbox"]')[0]!;
    expect(billsAll().classes()).toContain('app-checkbox--sm');

    await billsAll().trigger('click');
    expect(isChecked(billsAll())).toBe(true);
    ['NT$2,000', 'NT$1,000', 'NT$500', 'NT$200', 'NT$100'].forEach((l) => expect(isChecked(checkbox(wrapper, l))).toBe(true));

    await billsAll().trigger('click');
    expect(isChecked(billsAll())).toBe(false);
    expect(saved().denominations).toEqual([50, 10, 5, 1]);
  });

  it('CSV 範例 downloads a sample for the current mode', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:sample');
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toMatch(/\.csv$/);
    });
    const wrapper = mountForm();

    await wrapper.find('.app-preferences-form__sample').trigger('click');
    expect(click).toHaveBeenCalledTimes(1);
    const namesCsv = await createObjectURL.mock.calls[0]![0].text();
    expect(namesCsv).toContain('姓名,金額\r\n張三,18500');

    await checkbox(wrapper, '資料包含姓名和金額').trigger('click');
    await wrapper.find('.app-preferences-form__sample').trigger('click');
    const amountCsv = await createObjectURL.mock.calls[1]![0].text();
    expect(amountCsv).toContain('金額\r\n18500');
    expect(amountCsv).not.toContain('姓名');
  });

  describe('draft mode (v-model, used by the guest drawer)', () => {
    const draft = { includesNames: true, denominations: [1000, 500, 100, 50, 10, 5, 1] };

    it('shows the draft instead of the saved preferences', () => {
      const wrapper = mountForm({ modelValue: { includesNames: false, denominations: [1000, 1] } });
      expect(isChecked(checkbox(wrapper, '資料包含姓名和金額'))).toBe(false);
      expect(isChecked(checkbox(wrapper, 'NT$500'))).toBe(false);
      expect(isChecked(checkbox(wrapper, 'NT$1'))).toBe(true);
    });

    it('emits the changed draft and saves nothing', async () => {
      const wrapper = mountForm({ modelValue: draft });
      await checkbox(wrapper, 'NT$200').trigger('click');
      await checkbox(wrapper, '資料包含姓名和金額').trigger('click');
      const emitted = wrapper.emitted('update:modelValue')!;
      expect(emitted[0]![0]).toEqual({ ...draft, denominations: [1000, 500, 200, 100, 50, 10, 5, 1] });
      expect(emitted[1]![0]).toEqual({ ...draft, includesNames: false });
      expect(localStorage.getItem('preferences')).toBeNull();
      expect(draft.denominations).toEqual([1000, 500, 100, 50, 10, 5, 1]);
    });

    it('does not emit when the change is ignored (turning off the last denomination)', async () => {
      const wrapper = mountForm({ modelValue: { includesNames: true, denominations: [1] } });
      await checkbox(wrapper, 'NT$1').trigger('click');
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });
  });
});
