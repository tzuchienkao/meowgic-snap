import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { onMounted, ref, type Ref } from 'vue';
import Callback from '../../../pages/auth/callback.vue';
import AppAlert from '../../../components/app/Alert/Alert.vue';
import AppButton from '../../../components/app/Button/Button.vue';
import AppIconButton from '../../../components/app/IconButton/IconButton.vue';
import { CALLBACK_ERROR_MESSAGES } from '../../../constants/auth';
import { RouteName } from '../../../constants/navigation';

let query: Record<string, string>;
let user: Ref<object | null>;
let initAuth: ReturnType<typeof vi.fn>;
let loadPreferences: ReturnType<typeof vi.fn>;
let navigateTo: ReturnType<typeof vi.fn>;
let wrapper: VueWrapper | undefined;

const mountCallback = async () => {
  wrapper = mount(Callback, { global: { components: { AppAlert, AppButton, AppIconButton } } });
  await flushPromises();
  return wrapper;
};

beforeEach(() => {
  query = {};
  user = ref(null);
  initAuth = vi.fn(async () => {});
  loadPreferences = vi.fn(async () => {});
  navigateTo = vi.fn();
  vi.stubGlobal('ref', ref);
  vi.stubGlobal('onMounted', onMounted);
  vi.stubGlobal('definePageMeta', () => {});
  vi.stubGlobal('useRoute', () => ({ query }));
  vi.stubGlobal('useAuth', () => ({ user, initAuth }));
  vi.stubGlobal('navigateTo', navigateTo);
  vi.mock('~/composables/usePreferences', () => ({ usePreferences: () => ({ loadPreferences }) }));
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.unstubAllGlobals();
});

describe('auth callback page', () => {
  it('signed in → loads 偏好設定 and goes home', async () => {
    initAuth.mockImplementation(async () => { user.value = { id: '1' }; });
    const w = await mountCallback();
    expect(loadPreferences).toHaveBeenCalled();
    expect(navigateTo).toHaveBeenCalledWith('/');
    expect(w.find('.app-alert').exists()).toBe(false);
  });

  it('expired or used link → says so, without trying to sign in', async () => {
    query = { error: 'access_denied', error_code: 'otp_expired' };
    const w = await mountCallback();
    expect(w.find('.app-alert').text()).toContain(CALLBACK_ERROR_MESSAGES.expired);
    expect(initAuth).not.toHaveBeenCalled();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('other link error → the general message', async () => {
    query = { error: 'server_error' };
    const w = await mountCallback();
    expect(w.find('.app-alert').text()).toContain(CALLBACK_ERROR_MESSAGES.failed);
  });

  it('still a guest after checking the session → the general message', async () => {
    const w = await mountCallback();
    expect(initAuth).toHaveBeenCalled();
    expect(w.find('.app-alert').text()).toContain(CALLBACK_ERROR_MESSAGES.failed);
    expect(loadPreferences).not.toHaveBeenCalled();
  });

  it('回首頁 goes to the home page', async () => {
    const w = await mountCallback();
    await w.find('button').trigger('click');
    expect(navigateTo).toHaveBeenCalledWith({ name: RouteName.Index });
  });
});
