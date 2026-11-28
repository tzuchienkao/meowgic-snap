import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { ref, type Ref } from 'vue';
import AppButton from '../../components/app/Button/Button.vue';
import AppCard from '../../components/app/Card/Card.vue';
import AppCatEarCard from '../../components/app/CatEarCard/CatEarCard.vue';
import AppCheckbox from '../../components/app/Checkbox/Checkbox.vue';
import AppDialog from '../../components/app/Dialog/Dialog.vue';
import AppIconButton from '../../components/app/IconButton/IconButton.vue';
import AppIllustrationSlot from '../../components/app/IllustrationSlot/IllustrationSlot.vue';
import AppPageHeader from '../../components/app/PageHeader/PageHeader.vue';
import AppEmptyState from '../../components/app/EmptyState/EmptyState.vue';
import AppInput from '../../components/app/Input/Input.vue';
import AppPreferencesForm from '../../components/app/PreferencesForm/PreferencesForm.vue';
import SettingsPage from '../../pages/settings.vue';
import { MEMBER_SAVE_DEBOUNCE_MS } from '../../composables/usePreferences';
import { createFakeSupabase, type FakeSupabase } from '../helpers/fakeSupabase';

interface ITestUser {
  id: string;
  email: string;
  display_name?: string;
}

let store: Record<string, Ref<unknown>>;
const useStateStub = <T>(key: string, init: () => T) => {
  if (!store[key]) store[key] = ref(init());
  return store[key] as Ref<T>;
};
let userRef: Ref<ITestUser | null>;
let updateUserName: ReturnType<typeof vi.fn>;
let showToast: ReturnType<typeof vi.fn>;
let supabase: FakeSupabase;
let wrapper: VueWrapper | undefined;

const mountPage = () => {
  wrapper = mount(SettingsPage, {
    attachTo: document.body,
    global: {
      components: {
        AppButton,
        AppCard,
        AppCatEarCard,
        AppCheckbox,
        AppDialog,
        AppIconButton,
        AppIllustrationSlot,
        AppEmptyState,
        AppPageHeader,
        AppInput,
        AppPreferencesForm,
      },
    },
  });
  return wrapper;
};

const findButton = (w: VueWrapper, label: string) => w.findAll('button').find((b) => b.text() === label);
const nameInput = (w: VueWrapper) => w.findAll('.app-input')[0]!;
const saveButton = (w: VueWrapper) => nameInput(w).find('.profile-card__save');

beforeEach(() => {
  store = {};
  localStorage.clear();
  userRef = ref({ id: 'u1', email: 'cat@example.com', display_name: '小橘' });
  updateUserName = vi.fn(async (name: string) => {
    userRef.value!.display_name = name;
    return true;
  });
  showToast = vi.fn();
  vi.stubGlobal('useState', useStateStub);
  vi.stubGlobal('useAuth', () => ({ user: userRef, updateUserName }));
  vi.stubGlobal('useToast', () => ({ showToast }));
  supabase = createFakeSupabase(() => userRef.value?.id ?? null);
  vi.stubGlobal('useNuxtApp', () => ({ $supabase: supabase }));
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('pages/settings.vue', () => {
  it('keeps the title row and lays out a one / two column grid', () => {
    const w = mountPage();
    expect(w.find('h1').text()).toBe('設定');
    expect(w.find('.page-settings__body').classes()).toEqual(
      expect.arrayContaining(['grid', 'grid-cols-1', 'desktop:grid-cols-2']),
    );
  });

  describe('個人資料', () => {
    it('shows the saved name, count, hint and a readonly email; no 儲存 button yet', () => {
      const w = mountPage();
      const field = nameInput(w);
      expect(field.find('.app-input__label').text()).toBe('個人名稱');
      expect((field.find('input').element as HTMLInputElement).value).toBe('小橘');
      expect(field.find('.app-input__meta').text()).toContain('顯示在右上角');
      expect(field.find('.app-input__meta').text()).toContain('2 / 5');
      expect(saveButton(w).exists()).toBe(false);

      const email = w.findAll('.app-input')[1]!;
      expect(email.find('.app-input__label').text()).toBe('登入信箱');
      expect(email.find('input').attributes('readonly')).toBeDefined();
      expect((email.find('input').element as HTMLInputElement).value).toBe('cat@example.com');
    });

    it('shows 儲存 only when the name changed and is valid', async () => {
      const w = mountPage();
      const input = nameInput(w).find('input');

      await input.setValue('小黑');
      expect(saveButton(w).exists()).toBe(true);
      expect(saveButton(w).text()).toBe('儲存');

      await input.setValue('小橘子貓咪喵'); // 6 characters
      expect(saveButton(w).exists()).toBe(false);
      expect(nameInput(w).find('.app-input__meta').text()).toContain('最多 5 個字');
      expect(nameInput(w).find('input').attributes('aria-invalid')).toBe('true');

      await input.setValue('小橘'); // back to the saved name
      expect(saveButton(w).exists()).toBe(false);
    });

    it('does not save on blur', async () => {
      const w = mountPage();
      const input = nameInput(w).find('input');
      await input.setValue('小黑');
      await input.trigger('blur');
      expect(updateUserName).not.toHaveBeenCalled();
    });

    it('儲存 saves the name, shows the toast and hides the button', async () => {
      const w = mountPage();
      await nameInput(w).find('input').setValue('小黑');
      await saveButton(w).trigger('click');
      await flushPromises();

      expect(updateUserName).toHaveBeenCalledWith('小黑');
      expect(showToast).toHaveBeenCalledWith('名稱存好了喵');
      expect(saveButton(w).exists()).toBe(false);
    });

    it('shows the failure toast when saving fails', async () => {
      updateUserName.mockImplementation(async () => false);
      const w = mountPage();
      await nameInput(w).find('input').setValue('小黑');
      await saveButton(w).trigger('click');
      await flushPromises();

      expect(showToast).toHaveBeenCalledWith('名稱沒有存成功喵，再試一次看看');
      expect(saveButton(w).exists()).toBe(true);
    });
  });

  describe('帳號', () => {
    it('renders the 停用 and 刪除帳號 rows', () => {
      const w = mountPage();
      const card = w.find('.account-card');
      expect(card.find('.app-card__title').text()).toBe('帳號');
      const rows = card.findAll('.account-row');
      expect(rows[0]!.text()).toContain('停用帳號');
      expect(rows[0]!.text()).toContain('先讓貓咪睡一下。紀錄會保留，之後用同一個信箱登入就會恢復。');
      expect(rows[0]!.find('button').classes()).toEqual(expect.arrayContaining(['app-button--outline', 'app-button--md']));
      expect(rows[1]!.classes()).toContain('account-row--warn');
      expect(rows[1]!.text()).toContain('帳號和全部紀錄都會永久刪除，救不回來喵。');
      expect(rows[1]!.find('button').classes()).toEqual(expect.arrayContaining(['app-button--danger', 'app-button--md']));
    });

    it('停用 only shows the "not ready" toast', async () => {
      const w = mountPage();
      await findButton(w, '停用')!.trigger('click');
      expect(showToast).toHaveBeenCalledWith('這個功能還在準備中喵');
    });

    it('刪除帳號 opens an alert dialog; confirming closes it with the "not ready" toast', async () => {
      const w = mountPage();
      expect(w.find('.app-dialog').exists()).toBe(false);

      await w.find('.account-row--warn button').trigger('click');
      const panel = w.find('.app-dialog__panel');
      expect(panel.attributes('role')).toBe('alertdialog');
      expect(w.find('.app-dialog__scrim').classes()).toContain('app-dialog__scrim--strong');
      expect(w.find('.app-dialog__title').text()).toBe('確定要刪除帳號？');
      expect(panel.find('.app-illustration-slot img').attributes('alt')).toBe('貓咪插畫：緊抓帳本不放');
      expect(panel.find('.delete-dialog__text').text()).toBe('帳號和全部紀錄都會永久刪除，救不回來喵。');

      const confirm = panel.find('.delete-dialog__actions button');
      expect(confirm.text()).toBe('刪除帳號');
      expect(confirm.classes()).toEqual(expect.arrayContaining(['app-button--danger', 'app-button--full']));
      await confirm.trigger('click');
      expect(w.find('.app-dialog').exists()).toBe(false);
      expect(showToast).toHaveBeenCalledWith('這個功能還在準備中喵');
    });

    it('先不要 closes the dialog without a toast', async () => {
      const w = mountPage();
      await w.find('.account-row--warn button').trigger('click');
      await findButton(w, '先不要')!.trigger('click');
      expect(w.find('.app-dialog').exists()).toBe(false);
      expect(showToast).not.toHaveBeenCalled();
    });
  });

  describe('偏好設定', () => {
    const status = (w: VueWrapper) => w.find('.preferences-card__status');
    const toggle = async (w: VueWrapper, label: string) =>
      w.find('.preferences-card').findAll('[role="checkbox"]').find((c) => c.text() === label)!.trigger('click');

    it('shows the save status and the preferences form bound to the member', async () => {
      const w = mountPage();
      const card = w.find('.preferences-card');
      expect(card.find('h2').text()).toBe('偏好設定');
      expect(status(w).text()).toBe('已自動儲存');
      expect(status(w).attributes('aria-live')).toBe('polite');
      expect(card.find('.app-preferences-form').exists()).toBe(true);

      vi.useFakeTimers();
      const twenty = card.findAll('[role="checkbox"]').find((c) => c.text() === 'NT$20')!;
      await twenty.trigger('click');
      expect(twenty.attributes('aria-checked')).toBe('true');
      expect(status(w).text()).toBe('儲存中…');

      // Saved to the member's account after the debounce, never to the guest key
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS);
      expect((supabase.metadata.u1!.preferences as { denominations: number[] }).denominations).toContain(20);
      expect(localStorage.getItem('preferences')).toBeNull();
      expect(status(w).text()).toBe('已自動儲存');
    });

    it('a failed save shows 沒存成功 with 再試一次, which sends the current preferences again', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      supabase.auth.updateUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('offline') });
      const w = mountPage();
      vi.useFakeTimers();

      await toggle(w, 'NT$20');
      await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS);
      expect(status(w).text()).toMatch(/^沒存成功\s+再試一次$/);
      expect(status(w).classes()).toContain('preferences-card__status--failed');

      await status(w).find('.preferences-card__retry').trigger('click');
      await flushPromises();
      expect(status(w).text()).toBe('已自動儲存');
      expect(status(w).find('.preferences-card__retry').exists()).toBe(false);
      expect(supabase.auth.updateUser).toHaveBeenCalledTimes(2);
      expect((supabase.metadata.u1!.preferences as { denominations: number[] }).denominations).toContain(20);
    });
  });
});
