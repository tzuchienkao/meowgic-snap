import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type PropType, type Ref } from 'vue';
import PreferencesDrawer from '../../components/app/PreferencesDrawer/PreferencesDrawer.vue';
import IconButton from '../../components/app/IconButton/IconButton.vue';
import AppButton from '../../components/app/Button/Button.vue';
import { PREFERENCES_SAVED_MESSAGE } from '../../constants/user';
import type { IPreferences } from '../../utils/preferences';

// The form itself is covered in PreferencesForm.test.ts; here we check it is placed stacked and bound
// to the draft. The stub's buttons stand in for edits: one toggles NT$200, one undoes it.
const PreferencesFormStub = defineComponent({
  props: { stacked: { type: Boolean, default: false }, modelValue: { type: Object as PropType<IPreferences>, default: undefined } },
  emits: ['update:modelValue'],
  setup: (props, { emit }) => () =>
    h('div', { class: 'form-stub', 'data-stacked': String(props.stacked), 'data-denominations': props.modelValue?.denominations.join(',') }, [
      h('button', { class: 'inside add-200', onClick: () => emit('update:modelValue', { ...props.modelValue!, denominations: [...props.modelValue!.denominations, 200].sort((a, b) => b - a) }) }, '+200'),
      h('button', { class: 'remove-200', onClick: () => emit('update:modelValue', { ...props.modelValue!, denominations: props.modelValue!.denominations.filter((d) => d !== 200) }) }, '-200')
    ])
});

let store: Record<string, Ref<unknown>>;
const showToast = vi.fn();
beforeEach(() => {
  store = {};
  localStorage.clear();
  showToast.mockClear();
  vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
    if (!store[key]) store[key] = ref(init());
    return store[key] as Ref<T>;
  });
  vi.stubGlobal('useAuth', () => ({ user: ref(null) }));
  vi.stubGlobal('useToast', () => ({ showToast }));
});

let wrapper: VueWrapper | undefined;
// realTransition: use Vue's <Transition> instead of the test-utils stub (which swaps instantly)
const mountDrawer = ({ realTransition = false } = {}) => {
  wrapper = mount(PreferencesDrawer, {
    attachTo: document.body,
    global: {
      components: { AppIconButton: IconButton, AppButton, AppPreferencesForm: PreferencesFormStub },
      stubs: realTransition ? { transition: false } : {}
    }
  });
  return wrapper;
};
const tab = (w: VueWrapper) => w.find('.app-preferences-tab');
const panel = (w: VueWrapper) => w.find('.app-preferences-drawer__panel');

const saveButton = (w: VueWrapper) => w.find('.app-preferences-drawer__foot button');
const savedPreferences = () => (store['preferences:cache']?.value as Record<string, IPreferences> | undefined)?.preferences;

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.unstubAllGlobals();
});

describe('PreferencesDrawer (guest 偏好設定)', () => {
  it('shows only the left-edge tab when closed', () => {
    const w = mountDrawer();
    expect(tab(w).text()).toContain('偏好設定');
    expect(tab(w).attributes('aria-label')).toBe('開啟偏好設定');
    expect(tab(w).attributes('aria-expanded')).toBe('false');
    expect(panel(w).exists()).toBe(false);
  });

  it('opens a labelled modal panel with the stacked form, and the save button', async () => {
    const w = mountDrawer();
    await tab(w).trigger('click');
    expect(tab(w).attributes('aria-expanded')).toBe('true');
    const p = panel(w);
    expect(p.attributes('role')).toBe('dialog');
    expect(p.attributes('aria-modal')).toBe('true');
    const title = w.find('.app-preferences-drawer__title');
    expect(title.text()).toBe('偏好設定');
    expect(p.attributes('aria-labelledby')).toBe(title.attributes('id'));
    expect(w.find('.form-stub').attributes('data-stacked')).toBe('true');
    expect(saveButton(w).text()).toBe('喵不負責存檔(=ΦωΦ=)');
  });

  describe('save button', () => {
    it('is disabled until the draft differs from the saved preferences', async () => {
      const w = mountDrawer();
      await tab(w).trigger('click');
      expect(saveButton(w).attributes('disabled')).toBeDefined();

      await w.find('.add-200').trigger('click');
      expect(saveButton(w).attributes('disabled')).toBeUndefined();

      // Undoing the change makes it clean again
      await w.find('.remove-200').trigger('click');
      expect(saveButton(w).attributes('disabled')).toBeDefined();
    });

    it('edits only the draft until saved', async () => {
      const w = mountDrawer();
      await tab(w).trigger('click');
      await w.find('.add-200').trigger('click');
      expect(w.find('.form-stub').attributes('data-denominations')).toContain('200');
      expect(savedPreferences()?.denominations ?? []).not.toContain(200);
      expect(localStorage.getItem('preferences')).toBeNull();
    });

    it('saves the draft, shows a toast and closes', async () => {
      const w = mountDrawer();
      await tab(w).trigger('click');
      await w.find('.add-200').trigger('click');
      await saveButton(w).trigger('click');

      expect(savedPreferences()?.denominations).toContain(200);
      expect(JSON.parse(localStorage.getItem('preferences')!).denominations).toContain(200);
      expect(showToast).toHaveBeenCalledWith(PREFERENCES_SAVED_MESSAGE);
      expect(panel(w).exists()).toBe(false);
    });

    it('closing without saving discards the draft; reopening starts from the saved preferences', async () => {
      const w = mountDrawer();
      await tab(w).trigger('click');
      await w.find('.add-200').trigger('click');
      await w.find('.app-preferences-drawer__head button').trigger('click');
      expect(localStorage.getItem('preferences')).toBeNull();
      expect(showToast).not.toHaveBeenCalled();

      await tab(w).trigger('click');
      expect(w.find('.form-stub').attributes('data-denominations')).not.toContain('200');
      expect(saveButton(w).attributes('disabled')).toBeDefined();
    });
  });

  it.each([
    ['the × button', async (w: VueWrapper) => w.find('.app-preferences-drawer__head button').trigger('click')],
    ['the scrim', async (w: VueWrapper) => w.find('.app-preferences-drawer__scrim').trigger('click')],
    ['Esc', async (w: VueWrapper) => panel(w).trigger('keydown', { key: 'Escape' })]
  ])('closes with %s', async (_label, action) => {
    const w = mountDrawer();
    await tab(w).trigger('click');
    await action(w);
    expect(panel(w).exists()).toBe(false);
    expect(tab(w).attributes('aria-expanded')).toBe('false');
  });

  it('the × button is labelled for screen readers', async () => {
    const w = mountDrawer();
    await tab(w).trigger('click');
    expect(w.find('.app-preferences-drawer__head button').attributes('aria-label')).toBe('關閉偏好設定');
  });

  it('moves focus into the panel on open and back to the tab on close', async () => {
    const w = mountDrawer();
    (tab(w).element as HTMLElement).focus();
    await tab(w).trigger('click');
    await nextTick();
    await nextTick();
    expect(panel(w).element.contains(document.activeElement)).toBe(true);

    await panel(w).trigger('keydown', { key: 'Escape' });
    await nextTick();
    expect(document.activeElement).toBe(tab(w).element);
  });

  describe('with the real <Transition>', () => {
    const scrim = (w: VueWrapper) => w.find('.app-preferences-drawer__scrim');

    it('the panel slides in and the scrim fades in (enter classes)', async () => {
      const w = mountDrawer({ realTransition: true });
      await tab(w).trigger('click');
      expect(panel(w).classes()).toEqual(expect.arrayContaining(['app-preferences-panel-enter-from', 'app-preferences-panel-enter-active']));
      expect(scrim(w).classes()).toEqual(expect.arrayContaining(['app-preferences-scrim-enter-from', 'app-preferences-scrim-enter-active']));
    });

    it.each([
      ['the × button', async (w: VueWrapper) => w.find('.app-preferences-drawer__head button').trigger('click')],
      ['the scrim', async (w: VueWrapper) => scrim(w).trigger('click')],
      ['Esc', async (w: VueWrapper) => panel(w).trigger('keydown', { key: 'Escape' })]
    ])('closing with %s slides the panel out and returns focus to the tab right away', async (_label, action) => {
      const w = mountDrawer({ realTransition: true });
      (tab(w).element as HTMLElement).focus();
      await tab(w).trigger('click');
      await nextTick();
      await nextTick();
      expect(panel(w).element.contains(document.activeElement)).toBe(true);

      await action(w);
      // Still in the document while it leaves (no longer in the vnode tree, so query the DOM),
      // but focus is already back on the tab
      expect(document.querySelector('.app-preferences-drawer__panel')?.classList).toContain('app-preferences-panel-leave-active');
      expect(document.querySelector('.app-preferences-drawer__scrim')?.classList).toContain('app-preferences-scrim-leave-active');
      expect(document.activeElement).toBe(tab(w).element);
      expect(tab(w).attributes('aria-expanded')).toBe('false');

      // Removed once the leave transition has finished
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(document.querySelector('.app-preferences-drawer__panel')).toBeNull();
      expect(document.querySelector('.app-preferences-drawer__scrim')).toBeNull();
    });

    it('can be opened again after closing, and focus moves into the new panel', async () => {
      const w = mountDrawer({ realTransition: true });
      await tab(w).trigger('click');
      await panel(w).trigger('keydown', { key: 'Escape' });
      await new Promise((resolve) => setTimeout(resolve, 50));

      await tab(w).trigger('click');
      await nextTick();
      await nextTick();
      expect(panel(w).exists()).toBe(true);
      expect(panel(w).element.contains(document.activeElement)).toBe(true);
    });
  });
});
