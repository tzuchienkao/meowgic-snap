import { computed } from 'vue';
import { RouteName } from '~/constants/navigation';
import { DEFAULT_DISPLAY_NAME, LOGOUT_FAILED_MESSAGE } from '~/constants/user';

/**
 * Account info and actions shared by the desktop user menu and the mobile ☰ panel,
 * so both show the same name / email and do the same thing.
 */
export const useUserAccount = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const userName = computed(() => user.value?.display_name || DEFAULT_DISPLAY_NAME);
  const userEmail = computed(() => user.value?.email || '');

  const goToSettings = () => router.push({ name: RouteName.Settings });

  /**
   * Logging out on a member-only page leaves it for the home page (guests can't stay there).
   * If signOut fails the user is still signed in: say so instead of doing nothing.
   */
  const onLogout = async () => {
    await logout();
    if (user.value) {
      showToast(LOGOUT_FAILED_MESSAGE);
      return;
    }
    await router.push({ name: RouteName.Index });
  };

  return {
    userName,
    userEmail,
    goToSettings,
    onLogout
  };
};
