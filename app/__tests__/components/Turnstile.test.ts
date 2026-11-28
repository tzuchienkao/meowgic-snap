import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Turnstile from '../../components/app/Turnstile/Turnstile.vue';
import type { ITurnstileOptions } from '../../utils/turnstile';

let options: ITurnstileOptions | undefined;
const turnstile = {
  render: vi.fn((_el: HTMLElement, opts: ITurnstileOptions) => {
    options = opts;
    return 'widget-1';
  }),
  reset: vi.fn(),
  remove: vi.fn(),
};

beforeEach(() => {
  options = undefined;
  vi.clearAllMocks();
  window.turnstile = turnstile;
});

afterEach(() => {
  delete window.turnstile;
});

describe('AppTurnstile', () => {
  it('renders the widget with the site key and passes its events on', async () => {
    const w = mount(Turnstile, { props: { siteKey: 'site-key' } });
    await flushPromises();
    expect(turnstile.render).toHaveBeenCalledWith(w.element, expect.objectContaining({ sitekey: 'site-key', language: 'zh-tw' }));

    options!.callback!('token-1');
    options!['expired-callback']!();
    options!['error-callback']!();
    expect(w.emitted('verify')).toEqual([['token-1']]);
    expect(w.emitted('expire')).toHaveLength(1);
    expect(w.emitted('error')).toHaveLength(1);
  });

  it('reset() asks the widget for a new token, and unmounting removes it', async () => {
    const w = mount(Turnstile, { props: { siteKey: 'site-key' } });
    await flushPromises();
    (w.vm as unknown as { reset: () => void }).reset();
    expect(turnstile.reset).toHaveBeenCalledWith('widget-1');
    w.unmount();
    expect(turnstile.remove).toHaveBeenCalledWith('widget-1');
  });
});
