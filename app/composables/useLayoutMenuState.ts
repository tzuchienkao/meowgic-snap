import type { IAppTab } from '~/components/app/Tab/ITab';
import { NAVIGATION_TABS } from '~/constants/navigation';
import { useTheme } from '~/composables/useTheme';
import { Themes } from '~/types/theme';
import { useModal } from '~/composables/useModal';

export const useLayoutMenuState = () => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const tabs = reactive<IAppTab[]>(
    NAVIGATION_TABS.map((tab) => ({
      ...tab,
      isActive: false
    }))
  );

  const currentTab = ref('index');
  const isShowAccountPanel = ref(false);

  const onTabClick = (tab: IAppTab) => {
    tabs.forEach((t: IAppTab) => {
      t.isActive = t.name === tab.name;
    });
    currentTab.value = tab.name;
    router.push({ name: tab.name });
  };

  const currentTheme = computed(() => {
    return theme.value === Themes.Dark ? '☀' : '☾';
  });

  const onThemeToggle = () => {
    toggleTheme();
  };

  const toggleAccountPanel = () => {
    isShowAccountPanel.value = !isShowAccountPanel.value;
  };

  const initPage = () => {
    const routerName = router.currentRoute.value.name;
    tabs.forEach((tab: IAppTab) => {
      tab.isActive = tab.name === routerName;
    });
    currentTab.value = routerName as string;
  };

  initPage();

  const { isShowModal, openModal, closeModal } = useModal();

  return {
    tabs,
    currentTab,
    onTabClick,
    currentTheme,
    onThemeToggle,
    isShowAccountPanel,
    toggleAccountPanel,
    isShowModal,
    openModal,
    closeModal
  };
};
