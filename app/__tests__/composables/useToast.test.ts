import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, type Ref } from 'vue';

let store: Record<string, Ref<unknown>>;
const useStateStub = <T>(key: string, init: () => T) => {
  if (!store[key]) store[key] = ref(init());
  return store[key] as Ref<T>;
};

const loadUseToast = async () => {
  vi.resetModules();
  return import('../../composables/useToast');
};

describe('useToast', () => {
  beforeEach(() => {
    store = {};
    vi.useFakeTimers();
    vi.stubGlobal('useState', useStateStub);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the message and hides it after TOAST_DURATION_MS', async () => {
    const { useToast, TOAST_DURATION_MS } = await loadUseToast();
    expect(TOAST_DURATION_MS).toBe(2000);
    const { toastMessage, isToastVisible, showToast } = useToast();

    expect(isToastVisible.value).toBe(false);
    showToast('hello 喵');
    expect(isToastVisible.value).toBe(true);
    expect(toastMessage.value).toBe('hello 喵');

    vi.advanceTimersByTime(1999);
    expect(isToastVisible.value).toBe(true);
    vi.advanceTimersByTime(1);
    expect(isToastVisible.value).toBe(false);
  });

  it('shares state between callers', async () => {
    const { useToast } = await loadUseToast();
    useToast().showToast('from page');
    expect(useToast().toastMessage.value).toBe('from page');
  });

  it('replacing a visible toast swaps the message and restarts the timer', async () => {
    const { useToast } = await loadUseToast();
    const { toastMessage, isToastVisible, showToast } = useToast();

    showToast('first');
    vi.advanceTimersByTime(1500);
    showToast('second');
    expect(toastMessage.value).toBe('second');

    vi.advanceTimersByTime(1500);
    expect(isToastVisible.value).toBe(true);
    vi.advanceTimersByTime(500);
    expect(isToastVisible.value).toBe(false);
  });
});
