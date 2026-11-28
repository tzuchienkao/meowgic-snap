import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, reactive, ref, type Ref } from 'vue';
import { CAPTCHA_LOAD_FAILED_MESSAGE } from '../../constants/auth';
import Landing from '../../layouts/desktop/landing.vue';
import AppButton from '../../components/app/Button/Button.vue';
import AppInput from '../../components/app/Input/Input.vue';
import AppDialog from '../../components/app/Dialog/Dialog.vue';
import AppIconButton from '../../components/app/IconButton/IconButton.vue';
import AppCatEarCard from '../../components/app/CatEarCard/CatEarCard.vue';
import AppAlert from '../../components/app/Alert/Alert.vue';
import { EMAIL_ERRORS } from '../../utils/validators';
import { LOGIN_ERROR_MESSAGES, MAGIC_LINK_COOLDOWN_SECONDS } from '../../constants/auth';
import { SupabaseErrorKind } from '../../utils/supabaseErrors';
import type { ISignInResult } from '../../types/auth';

// Layout shells: just render their slots
const DesktopWrapper = defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) });
const AppHeader = defineComponent({ setup: (_, { slots }) => () => h('header', [slots.header?.(), slots.menu?.()]) });
const AppPreferencesDrawer = defineComponent({ setup: () => () => h('div', { class: 'drawer-stub' }) });
// Turnstile stand-in: tests drive it through its events; reset() is counted
const turnstileReset = vi.fn();
const AppTurnstile = defineComponent({
  props: { siteKey: { type: String, required: true } },
  emits: ['verify', 'expire', 'error'],
  setup: (_, { expose }) => {
    expose({ reset: turnstileReset });
    return () => h('div', { class: 'turnstile-stub' });
  },
});
let turnstileSiteKey = '';

let isShowModal: Ref<boolean>;
let closeModal: ReturnType<typeof vi.fn>;
let signInWithMagicLink: ReturnType<typeof vi.fn<(email: string, captchaToken?: string) => Promise<ISignInResult>>>;
let wrapper: VueWrapper | undefined;

const mountLanding = () => {
  wrapper = mount(Landing, {
    attachTo: document.body,
    global: {
      components: { AppAlert, AppButton, AppInput, AppDialog, AppIconButton, AppCatEarCard, AppTurnstile, DesktopWrapper, AppHeader, AppPreferencesDrawer }
    }
  });
  return wrapper;
};

const emailInput = (w: VueWrapper) => w.find('.app-dialog input[type="email"]');
const hint = (w: VueWrapper) => w.find('.app-dialog .app-input__meta');
const dialogButton = (w: VueWrapper, text: string) => w.findAll('.app-dialog button').find((b) => b.text().includes(text))!;
const sendButton = (w: VueWrapper) => dialogButton(w, '寄');
const alert = (w: VueWrapper) => w.find('.app-dialog .app-alert');
const failWith = (kind: SupabaseErrorKind, retryAfterSeconds: number | null = null) =>
  signInWithMagicLink.mockResolvedValueOnce({ success: false, kind, retryAfterSeconds });
const sendTo = async (w: VueWrapper, email = 'meow@mail.com') => {
  await emailInput(w).setValue(email);
  await sendButton(w).trigger('click');
  await flushPromises();
};

beforeEach(() => {
  isShowModal = ref(true);
  closeModal = vi.fn(() => { isShowModal.value = false; });
  signInWithMagicLink = vi.fn(async () => ({ success: true }) as ISignInResult);
  vi.stubGlobal('ref', ref);
  vi.stubGlobal('reactive', reactive);
  vi.stubGlobal('useLayoutMenuState', () => ({ isShowModal, openModal: vi.fn(), closeModal }));
  vi.stubGlobal('useAuth', () => ({ signInWithMagicLink }));
  turnstileSiteKey = '';
  turnstileReset.mockClear();
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { turnstileSiteKey } }));
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('login dialog — email validation', () => {
  it('shows no error when the dialog opens', () => {
    const w = mountLanding();
    expect(hint(w).exists()).toBe(false);
    expect(emailInput(w).attributes('aria-invalid')).toBeUndefined();
  });

  it('empty email on submit → required error, nothing sent, focus back on the field', async () => {
    const w = mountLanding();
    await sendButton(w).trigger('click');
    await flushPromises();
    expect(hint(w).text()).toBe(EMAIL_ERRORS.required);
    expect(emailInput(w).attributes('aria-invalid')).toBe('true');
    expect(signInWithMagicLink).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(emailInput(w).element);
  });

  it('invalid email on submit → format error, nothing sent', async () => {
    const w = mountLanding();
    await emailInput(w).setValue('meow@mail');
    await sendButton(w).trigger('click');
    await flushPromises();
    expect(hint(w).text()).toBe(EMAIL_ERRORS.invalid);
    expect(signInWithMagicLink).not.toHaveBeenCalled();
  });

  it('checks on blur when something was typed, but not when empty', async () => {
    const w = mountLanding();
    await emailInput(w).trigger('blur');
    expect(hint(w).exists()).toBe(false);

    await emailInput(w).setValue('meowmail.com');
    await emailInput(w).trigger('blur');
    expect(hint(w).text()).toBe(EMAIL_ERRORS.invalid);
  });

  it('once shown, the error clears while typing as soon as the email is valid', async () => {
    const w = mountLanding();
    await emailInput(w).setValue('meow');
    await emailInput(w).trigger('blur');
    expect(hint(w).text()).toBe(EMAIL_ERRORS.invalid);

    await emailInput(w).setValue('meow@mail.com');
    expect(hint(w).exists()).toBe(false);
    expect(emailInput(w).attributes('aria-invalid')).toBeUndefined();
  });

  it('Enter in the field submits the form', async () => {
    const w = mountLanding();
    await emailInput(w).setValue('meow@mail.com');
    await w.find('.login-dialog__form').trigger('submit');
    await flushPromises();
    expect(signInWithMagicLink).toHaveBeenCalledWith('meow@mail.com', undefined);
  });

  it('closing the dialog clears the error', async () => {
    const w = mountLanding();
    await sendButton(w).trigger('click');
    expect(hint(w).exists()).toBe(true);

    await w.find('.app-dialog__close button').trigger('click');
    expect(closeModal).toHaveBeenCalledTimes(1);
    isShowModal.value = true;
    await flushPromises();
    expect(hint(w).exists()).toBe(false);
  });
});

describe('login dialog — sending the magic link', () => {
  it('sent → says where the link went, stays open, and counts down before resending', async () => {
    vi.useFakeTimers();
    const w = mountLanding();
    await sendTo(w, '  meow@mail.com ');
    expect(signInWithMagicLink).toHaveBeenCalledWith('meow@mail.com', undefined);
    expect(closeModal).not.toHaveBeenCalled();
    expect(w.find('.login-dialog__email').text()).toBe('meow@mail.com');
    expect(emailInput(w).exists()).toBe(false);

    const resend = () => dialogButton(w, '寄');
    expect(resend().text()).toBe(`${MAGIC_LINK_COOLDOWN_SECONDS} 秒後可以再寄`);
    expect(resend().attributes('disabled')).toBeDefined();

    await vi.advanceTimersByTimeAsync(MAGIC_LINK_COOLDOWN_SECONDS * 1000);
    expect(resend().text()).toBe('重新寄送');
    await resend().trigger('click');
    await flushPromises();
    expect(signInWithMagicLink).toHaveBeenCalledTimes(2);
    expect(signInWithMagicLink).toHaveBeenLastCalledWith('meow@mail.com', undefined);
  });

  it('換一個信箱 goes back to the form with the address kept', async () => {
    const w = mountLanding();
    await sendTo(w);
    await dialogButton(w, '換一個信箱').trigger('click');
    expect((emailInput(w).element as HTMLInputElement).value).toBe('meow@mail.com');
  });

  it('rate limited → inline message and a countdown from the server\'s wait', async () => {
    vi.useFakeTimers();
    failWith(SupabaseErrorKind.RateLimit, 12);
    const w = mountLanding();
    await sendTo(w);
    expect(alert(w).text()).toBe(LOGIN_ERROR_MESSAGES[SupabaseErrorKind.RateLimit]);
    expect(sendButton(w).text()).toBe('12 秒後可以再寄');
    expect(emailInput(w).exists()).toBe(true);

    await vi.advanceTimersByTimeAsync(12_000);
    expect(alert(w).exists()).toBe(false);
    expect(sendButton(w).text()).toBe('寄送魔法連結');
  });

  it('rate limited without a wait → the default cooldown', async () => {
    vi.useFakeTimers();
    failWith(SupabaseErrorKind.RateLimit);
    const w = mountLanding();
    await sendTo(w);
    expect(sendButton(w).text()).toBe(`${MAGIC_LINK_COOLDOWN_SECONDS} 秒後可以再寄`);
  });

  it('network error → inline message, can send again right away', async () => {
    failWith(SupabaseErrorKind.Network);
    const w = mountLanding();
    await sendTo(w);
    expect(alert(w).text()).toBe(LOGIN_ERROR_MESSAGES[SupabaseErrorKind.Network]);
    expect(sendButton(w).attributes('disabled')).toBeUndefined();
  });

  it('server refuses the address → error under the field, no alert', async () => {
    failWith(SupabaseErrorKind.InvalidInput);
    const w = mountLanding();
    await sendTo(w);
    expect(hint(w).text()).toBe(EMAIL_ERRORS.invalid);
    expect(alert(w).exists()).toBe(false);
  });

  it('closing the dialog clears the send error and returns to the form', async () => {
    failWith(SupabaseErrorKind.Unknown);
    const w = mountLanding();
    await sendTo(w);
    expect(alert(w).exists()).toBe(true);
    await w.find('.app-dialog__close button').trigger('click');
    isShowModal.value = true;
    await flushPromises();
    expect(alert(w).exists()).toBe(false);
  });
});

describe('login dialog — 人機驗證 (Turnstile)', () => {
  const turnstile = (w: VueWrapper) => w.findComponent(AppTurnstile);
  const verify = async (w: VueWrapper, token = 'token-1') => {
    turnstile(w).vm.$emit('verify', token);
    await flushPromises();
  };
  beforeEach(() => {
    turnstileSiteKey = 'site-key';
  });

  it('without a site key there is no widget and the link is sent without a token', async () => {
    turnstileSiteKey = '';
    const w = mountLanding();
    expect(w.find('.turnstile-stub').exists()).toBe(false);
    await sendTo(w);
    expect(signInWithMagicLink).toHaveBeenCalledWith('meow@mail.com', undefined);
  });

  it('can only send once verified, and sends the token', async () => {
    const w = mountLanding();
    expect(turnstile(w).props('siteKey')).toBe('site-key');
    expect(sendButton(w).text()).toBe('完成人機驗證後就能寄');
    expect(sendButton(w).attributes('disabled')).toBeDefined();

    await verify(w);
    await sendTo(w);
    expect(signInWithMagicLink).toHaveBeenCalledWith('meow@mail.com', 'token-1');
  });

  it('a token is used once: after a failed send it asks for a new one', async () => {
    failWith(SupabaseErrorKind.Captcha);
    const w = mountLanding();
    await verify(w);
    await sendTo(w);
    expect(alert(w).text()).toBe(LOGIN_ERROR_MESSAGES[SupabaseErrorKind.Captcha]);
    expect(turnstileReset).toHaveBeenCalledTimes(1);
    expect(sendButton(w).attributes('disabled')).toBeDefined();

    await verify(w, 'token-2');
    await sendButton(w).trigger('click');
    await flushPromises();
    expect(signInWithMagicLink).toHaveBeenLastCalledWith('meow@mail.com', 'token-2');
  });

  it('an expired token can no longer be sent', async () => {
    const w = mountLanding();
    await verify(w);
    turnstile(w).vm.$emit('expire');
    await flushPromises();
    expect(sendButton(w).attributes('disabled')).toBeDefined();
  });

  it('a widget error says so, and clears once it verifies', async () => {
    const w = mountLanding();
    turnstile(w).vm.$emit('error');
    await flushPromises();
    expect(alert(w).text()).toBe(CAPTCHA_LOAD_FAILED_MESSAGE);
    await verify(w);
    expect(alert(w).exists()).toBe(false);
  });
});

describe('guest layout — 偏好設定 drawer', () => {
  it('renders the guest 偏好設定 drawer (left-edge tab)', () => {
    const w = mountLanding();
    expect(w.find('.drawer-stub').exists()).toBe(true);
  });
});
