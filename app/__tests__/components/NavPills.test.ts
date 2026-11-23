import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, reactive } from 'vue';
import NavPills from '../../components/app/NavPills/NavPills.vue';
import { NAVIGATION_ITEMS } from '../../constants/navigation';

// NuxtLink stand-in: renders <a href="/<route name>"> and passes attrs/listeners through.
const NuxtLinkStub = defineComponent({
  props: { to: { type: Object, required: true } },
  setup(props, { slots }) {
    return () => h('a', { href: `/${(props.to as { name: string }).name}` }, slots.default?.());
  }
});

let route: { name: string };

const mountNav = () =>
  mount(NavPills, {
    props: { items: NAVIGATION_ITEMS, ariaLabel: '主要頁面' },
    global: { components: { NuxtLink: NuxtLinkStub } }
  });

const items = (wrapper: ReturnType<typeof mountNav>) => wrapper.findAll('a.app-nav-pills__item');

describe('NavPills — header page navigation', () => {
  beforeEach(() => {
    route = reactive({ name: 'index' });
    vi.stubGlobal('useRoute', () => route);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a labelled <nav> with one link per page, in order', () => {
    const wrapper = mountNav();
    const nav = wrapper.find('nav.app-nav-pills');
    expect(nav.exists()).toBe(true);
    expect(nav.attributes('aria-label')).toBe('主要頁面');
    expect(items(wrapper).map((a) => a.text())).toEqual(['首頁', '儀表板', '紀錄', '設定']);
    expect(items(wrapper).map((a) => a.attributes('href'))).toEqual(['/index', '/dashboard', '/logs', '/settings']);
  });

  it('does not use tab roles (it is navigation, not in-page tabs)', () => {
    const wrapper = mountNav();
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.find('[role="tab"]').exists()).toBe(false);
  });

  it('marks only the current route with aria-current="page" and is-active', () => {
    route.name = 'dashboard';
    const wrapper = mountNav();
    const current = items(wrapper).filter((a) => a.attributes('aria-current') === 'page');
    expect(current.map((a) => a.text())).toEqual(['儀表板']);
    expect(items(wrapper).filter((a) => a.classes('is-active')).map((a) => a.text())).toEqual(['儀表板']);
  });

  it('follows route changes (e.g. browser back / forward) without clicking', async () => {
    const wrapper = mountNav();
    expect(items(wrapper)[0]!.attributes('aria-current')).toBe('page');

    route.name = 'settings';
    await nextTick();

    expect(items(wrapper)[0]!.attributes('aria-current')).toBeUndefined();
    expect(items(wrapper)[3]!.attributes('aria-current')).toBe('page');
  });

  it('marks nothing active on a route that is not in the list', () => {
    route.name = 'auth-callback';
    const wrapper = mountNav();
    expect(wrapper.find('[aria-current]').exists()).toBe(false);
    expect(wrapper.find('.is-active').exists()).toBe(false);
  });

  it('emits navigate with the clicked item', async () => {
    const wrapper = mountNav();
    await items(wrapper)[2]!.trigger('click');
    expect(wrapper.emitted('navigate')).toEqual([[{ name: 'logs', label: '紀錄' }]]);
  });
});
