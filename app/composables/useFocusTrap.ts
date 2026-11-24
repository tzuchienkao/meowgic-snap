import { nextTick } from 'vue';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Focus handling for modal surfaces (Dialog, the guest 偏好設定 drawer), without a watcher:
 * - `onPanelRef` is a stable function ref: Vue calls it with the panel element when the surface
 *   is rendered (open) and with null when it is removed (closed or unmounted). On open, focus
 *   moves to the first field (or the panel); on close it returns to what had focus before.
 * - `onKeydown` closes on Esc and keeps Tab / Shift+Tab inside the panel.
 */
export const useFocusTrap = (onClose: () => void) => {
  let panel: HTMLElement | null = null;
  let previouslyFocused: HTMLElement | null = null;

  const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

  const onPanelRef = (el: unknown) => {
    if (el instanceof HTMLElement) {
      if (panel === el) return;
      panel = el;
      previouslyFocused = document.activeElement as HTMLElement | null;
      // Wait until the whole surface is attached to the document before moving focus.
      nextTick(() => {
        const firstField = el.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled])');
        (firstField ?? el).focus();
      });
    } else if (panel) {
      panel = null;
      previouslyFocused?.focus?.();
      previouslyFocused = null;
    }
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return { onPanelRef, onKeydown };
};
