interface IUser {
  id: string;
  email: string;
  name: string;
  display_name?: string;
}

export const useAuth = () => {
  const user = useState('user', () => null);
  const isAuthenticated = computed(() => !!user.value);
  const isLoading = useState('auth:loading', () => false);
  const error = useState('auth:error', () => null as string | null);

  const supabase = useNuxtApp().$supabase;

  const setUser = (value: IUser | null) => {
    user.value = value;
    if (value && import.meta.client) {
      localStorage.setItem('user', JSON.stringify(value));
    } else if (!value && import.meta.client) {
      localStorage.removeItem('user');
    }
  };

  const logout = async () => {
    try {
      isLoading.value = true;
      error.value = null;
      
      if (supabase) {
        await supabase.auth.signOut();
      }
      user.value = null;
      if (import.meta.client) {
        localStorage.removeItem('user');
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登出失敗';
      console.error('Logout error:', err);
    } finally {
      isLoading.value = false;
    }
  };

  // Magic Link 登入
  const signInWithMagicLink = async (email: string) => {
    try {
      isLoading.value = true;
      error.value = null;

      if (!supabase) {
        throw new Error('Supabase 未初始化');
      }

      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (err) throw err;
      
      return { success: true };
    } catch (err) {
      error.value = err instanceof Error ? err.message : '發送 Magic Link 失敗';
      console.error('Magic link error:', err);
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  };

  // 驗證 session
  const verifySession = async () => {
    try {
      if (!supabase) return;

      const { data: { session }, error: err } = await supabase.auth.getSession();
      
      if (err) throw err;

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email || '使用者',
          display_name: session.user.user_metadata?.display_name || undefined,
        });
      }
    } catch (err) {
      console.error('Session verification error:', err);
      error.value = err instanceof Error ? err.message : '驗證 Session 失敗';
    }
  };

  const updateUserName = async (name: string) => {
    try {
      isLoading.value = true;
      error.value = null;

      if (!supabase) {
        throw new Error('Supabase 未初始化');
      }

      const { error: err } = await supabase.auth.updateUser({
        data: {
          display_name: name
        }
      });

      if (err) throw err;

      if (user.value) {
        user.value.display_name = name;
        if (import.meta.client) {
          localStorage.setItem('user', JSON.stringify(user.value));
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新名稱失敗';
      console.error('Update user name error:', err);
    } finally {
      isLoading.value = false;
    }
  };

  // 初始化認證
  const initAuth = async () => {
    // user.value = {
    //   id: '1',
    //   email: 'demo@meowgic.com',
    //   name: '喵奴才'
    // };
    if (import.meta.client) {
      // 優先檢查 Supabase session
      if (supabase) {
        await verifySession();
      }

      // 備用：檢查本地儲存
      if (!user.value) {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try {
            user.value = JSON.parse(savedUser);
          } catch (err) {
            localStorage.removeItem('user');
            console.error('Failed to parse saved user:', err);
          }
        }
      }
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    setUser,
    logout,
    signInWithMagicLink,
    verifySession,
    initAuth,
    updateUserName
  };
};