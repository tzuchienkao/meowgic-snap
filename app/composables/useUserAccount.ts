import { computed } from 'vue';
import { RouteName } from '~/constants/navigation';
import { DEFAULT_DISPLAY_NAME } from '~/constants/user';

/**
 * Account info and actions shared by the desktop user menu and the mobile ☰ panel,
 * so both show the same name / email and do the same thing.
 */
export const useUserAccount = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const userName = computed(() => user.value?.display_name || DEFAULT_DISPLAY_NAME);
  const userEmail = computed(() => user.value?.email || '');

  const goToSettings = () => router.push({ name: RouteName.Settings });

  const onLogout = () => logout();

  return {
    userName,
    userEmail,
    goToSettings,
    onLogout
  };
};
