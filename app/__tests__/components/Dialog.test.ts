import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import Dialog from '../../components/app/Dialog/Dialog.vue';
import IconButton from '../../components/app/IconButton/IconButton.vue';
import CatEarCard from '../../components/app/CatEarCard/CatEarCard.vue';

const global = { components: { AppIconButton: IconButton, AppCatEarCard: CatEarCard } };
let wrapper: VueWrapper | undefined;

const mountDialog = (props: Record<string, unknown> = {}, slot = '<p class="msg">內容</p>') => {
  wrapper = mount(Dialog, { props: { open: true, title: '登入 / 註冊', ...props }, slots: { default: slot }, global, attachTo: document.body });
  return wrapper;
};

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('Dialog (design system)', () => {
  it('renders nothing when closed', () => {
    const w = mountDialog({ open: false });
    expect(w.find('.app-dialog').exists()).toBe(false);
  });

  it('is a modal dialog labelled by its title', () => {
    const w = mountDialog();
    const panel = w.find('.app-dialog__panel');
    expect(panel.attributes('role')).toBe('dialog');
    expect(panel.attributes('aria-modal')).toBe('true');
    const title = w.find('.app-dialog__title');
    expect(title.text()).toBe('登入 / 註冊');
    expect(panel.attributes('aria-labelledby')).toBe(title.attributes('id'));
    expect(w.find('.msg').text()).toBe('內容');
  });

  it('alert uses role="alertdialog" and the strong scrim', () => {
    const w = mountDialog({ alert: true, title: '確定要刪除帳號？' });
    expect(w.find('.app-dialog__panel').attributes('role')).toBe('alertdialog');
    expect(w.find('.app-dialog__scrim').classes()).toContain('app-dialog__scrim--strong');
  });

  it('scrim click emits close, unless persistent', async () => {
    const w = mountDialog();
    await w.find('.app-dialog__scrim').trigger('click');
    expect(w.emitted('close')).toHaveLength(1);
    w.unmount();

    const p = mountDialog({ persistent: true });
    await p.find('.app-dialog__scrim').trigger('click');
    expect(p.emitted('close')).toBeUndefined();
  });

  it('Esc emits close, even when persistent', async () => {
    const w = mountDialog({ persistent: true });
    await w.find('.app-dialog__panel').trigger('keydown', { key: 'Escape' });
    expect(w.emitted('close')).toHaveLength(1);
  });

  it('closable shows a labelled × that emits close; hidden by default', async () => {
    expect(mountDialog().find('.app-dialog__close').exists()).toBe(false);
    wrapper!.unmount();
    const w = mountDialog({ closable: true });
    const close = w.find('.app-dialog__close button');
    expect(close.attributes('aria-label')).toBe('關閉');
    await close.trigger('click');
    expect(w.emitted('close')).toHaveLength(1);
  });

  it('catEars renders a dialog-size CatEarCard; otherwise a plain card', () => {
    const w = mountDialog({ catEars: true });
    expect(w.find('.app-cat-ear-card.app-cat-ear-card--dialog').exists()).toBe(true);
    expect(w.find('.app-dialog__card').exists()).toBe(false);
    wrapper!.unmount();
    const plain = mountDialog();
    expect(plain.find('.app-dialog__card').exists()).toBe(true);
    expect(plain.find('.app-cat-ear-card').exists()).toBe(false);
  });

  it('width defaults to 420px (capped at 100%) and is configurable', () => {
    expect(mountDialog().find('.app-dialog__panel').attributes('style')).toContain('--dialog-width: 420px');
    wrapper!.unmount();
    expect(mountDialog({ width: 360 }).find('.app-dialog__panel').attributes('style')).toContain('--dialog-width: 360px');
  });

  it('moves focus to the first field on open and restores it on close', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const w = mountDialog({ open: false }, '<input class="email" /><button class="send">送出</button>');
    await w.setProps({ open: true });
    await nextTick();
    await nextTick();
    expect(document.activeElement).toBe(w.find('.email').element);

    await w.setProps({ open: false });
    await nextTick();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('keeps Tab inside the dialog (wraps from last to first and back)', async () => {
    const w = mountDialog({}, '<input class="first" /><button class="last">送出</button>');
    await nextTick();
    const first = w.find('.first').element as HTMLElement;
    const last = w.find('.last').element as HTMLElement;

    last.focus();
    await w.find('.app-dialog__panel').trigger('keydown', { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    await w.find('.app-dialog__panel').trigger('keydown', { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
