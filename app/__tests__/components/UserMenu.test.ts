import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, ref, type Ref } from 'vue';
import UserMenu from '../../components/app/UserMenu/UserMenu.vue';
import Button from '../../components/app/Button/Button.vue';
import { useUserAccount } from '../../composables/useUserAccount';

let userRef: Ref<Record<string, string> | null>;
let logout: ReturnType<typeof vi.fn>;
let push: ReturnType<typeof vi.fn>;
let wrapper: VueWrapper | undefined;

const mountMenu = () => {
  wrapper = mount(UserMenu, { global: { components: { AppButton: Button } }, attachTo: document.body });
  return wrapper;
};
const trigger = (w: VueWrapper) => w.find('button[aria-haspopup="menu"]');

beforeEach(() => {
  userRef = ref({ id: 'u1', email: 'meow@mail.com', display_name: '喵奴才' });
  logout = vi.fn();
  push = vi.fn();
  vi.stubGlobal('useAuth', () => ({ user: userRef, logout }));
  vi.stubGlobal('useRouter', () => ({ push }));
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.unstubAllGlobals();
});

describe('useUserAccount', () => {
  it('exposes display name and email, falling back to 喵奴才', () => {
    const { userName, userEmail } = useUserAccount();
    expect(userName.value).toBe('喵奴才');
    expect(userEmail.value).toBe('meow@mail.com');
    userRef.value = { id: 'u2', email: 'a@b.test', display_name: '小黑' };
    expect(userName.value).toBe('小黑');
    userRef.value = { id: 'u3', email: 'c@d.test' };
    expect(userName.value).toBe('喵奴才');
    userRef.value = null;
    expect(userEmail.value).toBe('');
  });

  it('goToSettings pushes the settings route; onLogout calls logout', () => {
    const { goToSettings, onLogout } = useUserAccount();
    goToSettings();
    onLogout();
    expect(push).toHaveBeenCalledWith({ name: 'settings' });
    expect(logout).toHaveBeenCalledTimes(1);
  });
});

describe('UserMenu', () => {
  it('trigger shows the name with a decorative caret and is collapsed', () => {
    const w = mountMenu();
    const t = trigger(w);
    expect(t.text()).toBe('喵奴才▼');
    expect(t.attributes('aria-expanded')).toBe('false');
    expect(w.find('[role="menu"]').exists()).toBe(false);
  });

  it('opens a menu with account info and two items', async () => {
    const w = mountMenu();
    await trigger(w).trigger('click');
    expect(trigger(w).attributes('aria-expanded')).toBe('true');
    const menu = w.find('[role="menu"]');
    expect(menu.find('.app-user-menu__name').text()).toBe('喵奴才');
    expect(menu.find('.app-user-menu__email').text()).toBe('meow@mail.com');
    expect(menu.findAll('[role="menuitem"]').map((b) => b.text())).toEqual(['修改名稱與設定', '登出']);
  });

  it('修改名稱與設定 goes to settings and closes the menu', async () => {
    const w = mountMenu();
    await trigger(w).trigger('click');
    await w.findAll('[role="menuitem"]')[0]!.trigger('click');
    expect(push).toHaveBeenCalledWith({ name: 'settings' });
    expect(w.find('[role="menu"]').exists()).toBe(false);
  });

  it('登出 logs out and closes the menu', async () => {
    const w = mountMenu();
    await trigger(w).trigger('click');
    await w.findAll('[role="menuitem"]')[1]!.trigger('click');
    expect(logout).toHaveBeenCalledTimes(1);
    expect(w.find('[role="menu"]').exists()).toBe(false);
  });

  it('closes on a click outside, but not on a click inside', async () => {
    const w = mountMenu();
    await trigger(w).trigger('click');

    w.find('.app-user-menu__account').element.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await nextTick();
    expect(w.find('[role="menu"]').exists()).toBe(true);

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await nextTick();
    expect(w.find('[role="menu"]').exists()).toBe(false);
  });

  it('Esc closes and returns focus to the trigger', async () => {
    const w = mountMenu();
    await trigger(w).trigger('click');
    await w.find('[role="menuitem"]').trigger('keydown', { key: 'Escape' });
    expect(w.find('[role="menu"]').exists()).toBe(false);
    expect(document.activeElement).toBe(trigger(w).element);
  });

  it('clicking the trigger again closes it', async () => {
    const w = mountMenu();
    await trigger(w).trigger('click');
    await trigger(w).trigger('click');
    expect(w.find('[role="menu"]').exists()).toBe(false);
  });
});
