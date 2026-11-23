import { computed } from 'vue';

/**
 * Account info and actions shared by the desktop user menu and the mobile ☰ panel,
 * so both show the same name / email and do the same thing.
 */
export const useUserAccount = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const userName = computed(() => user.value?.display_name || '喵奴才');
  const userEmail = computed(() => user.value?.email || '');

  const goToSettings = () => router.push({ name: 'settings' });

  const onLogout = () => logout();

  return {
    userName,
    userEmail,
    goToSettings,
    onLogout
  };
};
