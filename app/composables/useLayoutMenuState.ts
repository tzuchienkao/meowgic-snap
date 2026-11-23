import { NAVIGATION_ITEMS } from '~/constants/navigation';
import { useTheme } from '~/composables/useTheme';
import { Themes } from '~/types/theme';
import { useModal } from '~/composables/useModal';

export const useLayoutMenuState = () => {
  const router = useRouter();
  const route = useRoute();
  const { theme, toggleTheme } = useTheme();

  const navItems = NAVIGATION_ITEMS;
  /** Active page comes from the route, so back/forward and other links keep it in sync. */
  const currentRouteName = computed(() => route.name);
  const isShowAccountPanel = ref(false);

  /** Mobile ☰ menu: go to the page and close the panel. */
  const onNavigate = (name: string) => {
    isShowAccountPanel.value = false;
    router.push({ name });
  };

  const currentTheme = computed(() => {
    return theme.value === Themes.Dark ? '☀' : '☾';
  });

  /** Accessible label for the theme IconButton (DS copy). */
  const themeToggleLabel = computed(() => {
    return theme.value === Themes.Dark ? '切換為橘白貓主題（淺色）' : '切換為黑貓主題（深色）';
  });

  const onThemeToggle = () => {
    toggleTheme();
  };

  const toggleAccountPanel = () => {
    isShowAccountPanel.value = !isShowAccountPanel.value;
  };

  const { isShowModal, openModal, closeModal } = useModal();

  return {
    navItems,
    currentRouteName,
    onNavigate,
    currentTheme,
    themeToggleLabel,
    onThemeToggle,
    isShowAccountPanel,
    toggleAccountPanel,
    isShowModal,
    openModal,
    closeModal
  };
};
