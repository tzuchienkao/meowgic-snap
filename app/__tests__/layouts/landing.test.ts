import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, reactive, ref, type Ref } from 'vue';
import Landing from '../../layouts/desktop/landing.vue';
import AppButton from '../../components/app/Button/Button.vue';
import AppInput from '../../components/app/Input/Input.vue';
import AppDialog from '../../components/app/Dialog/Dialog.vue';
import AppIconButton from '../../components/app/IconButton/IconButton.vue';
import AppCatEarCard from '../../components/app/CatEarCard/CatEarCard.vue';
import { EMAIL_ERRORS } from '../../utils/validators';

// Layout shells: just render their slots
const DesktopWrapper = defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) });
const AppHeader = defineComponent({ setup: (_, { slots }) => () => h('header', [slots.header?.(), slots.menu?.()]) });

let isShowModal: Ref<boolean>;
let closeModal: ReturnType<typeof vi.fn>;
let signInWithOtp: ReturnType<typeof vi.fn>;
let wrapper: VueWrapper | undefined;

const mountLanding = () => {
  wrapper = mount(Landing, {
    attachTo: document.body,
    global: {
      components: { AppButton, AppInput, AppDialog, AppIconButton, AppCatEarCard, DesktopWrapper, AppHeader }
    }
  });
  return wrapper;
};

const emailInput = (w: VueWrapper) => w.find('.app-dialog input[type="email"]');
const hint = (w: VueWrapper) => w.find('.app-dialog .app-input__meta');
const sendButton = (w: VueWrapper) => w.findAll('.app-dialog button').find((b) => b.text().includes('寄送'))!;

beforeEach(() => {
  isShowModal = ref(true);
  closeModal = vi.fn(() => { isShowModal.value = false; });
  signInWithOtp = vi.fn(async () => ({ error: null }));
  vi.stubGlobal('ref', ref);
  vi.stubGlobal('reactive', reactive);
  vi.stubGlobal('useLayoutMenuState', () => ({ isShowModal, openModal: vi.fn(), closeModal }));
  vi.stubGlobal('useNuxtApp', () => ({ $supabase: { auth: { signInWithOtp } } }));
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
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
    expect(signInWithOtp).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(emailInput(w).element);
  });

  it('invalid email on submit → format error, nothing sent', async () => {
    const w = mountLanding();
    await emailInput(w).setValue('meow@mail');
    await sendButton(w).trigger('click');
    await flushPromises();
    expect(hint(w).text()).toBe(EMAIL_ERRORS.invalid);
    expect(signInWithOtp).not.toHaveBeenCalled();
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

  it('valid email → sends the magic link with the trimmed address and closes', async () => {
    const w = mountLanding();
    await emailInput(w).setValue('meow@mail.com');
    await sendButton(w).trigger('click');
    await flushPromises();
    expect(signInWithOtp).toHaveBeenCalledTimes(1);
    expect(signInWithOtp.mock.calls[0]![0]).toMatchObject({ email: 'meow@mail.com' });
    expect(closeModal).toHaveBeenCalledTimes(1);
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
