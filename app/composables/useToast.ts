import { computed } from 'vue';

/** Design system --ms-toast-ms: auto-dismiss after 2s */
export const TOAST_DURATION_MS = 2000;

interface IToastState {
  message: string;
  isVisible: boolean;
}

// One timer for the single global toast (only ever set on the client)
let hideTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Global toast: app.vue renders one <app-toast fixed>; any page calls showToast(message).
 * A new toast replaces the current message and restarts the timer.
 */
export const useToast = () => {
  const state = useState<IToastState>('toast', () => ({ message: '', isVisible: false }));

  const showToast = (message: string) => {
    state.value = { message, isVisible: true };
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      state.value = { ...state.value, isVisible: false };
    }, TOAST_DURATION_MS);
  };

  return {
    toastMessage: computed(() => state.value.message),
    isToastVisible: computed(() => state.value.isVisible),
    showToast,
  };
};
