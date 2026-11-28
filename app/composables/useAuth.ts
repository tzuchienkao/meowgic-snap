import type { ISignInResult, IUser } from '~/types/auth';
import { getSupabaseErrorKind, getRetryAfterSeconds } from '~/utils/supabaseErrors'

interface IAuthUserFields {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

const toUser = ({ id, email, user_metadata: metadata }: IAuthUserFields): IUser => ({
  id,
  email: email || '',
  name: metadata?.name || email || '使用者',
  display_name: metadata?.display_name || undefined,
});

export const useAuth = () => {
  const user = useState<IUser | null>('user', () => null);
  const isAuthenticated = computed(() => !!user.value);
  const isLoading = useState('auth:loading', () => false);
  const error = useState<string | null>('auth:error', () => null);

  const supabase = useNuxtApp().$supabase;

  const setUser = (value: IUser | null) => {
    user.value = value;
  };

  const logout = async () => {
    try {
      isLoading.value = true;
      error.value = null;
      
      if (supabase) {
        const { error: err } = await supabase.auth.signOut();
        if (err) throw err;
      }
      user.value = null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登出失敗';
      console.error('Logout error:', err);
    } finally {
      isLoading.value = false;
    }
  };

  // Magic Link 登入
  const signInWithMagicLink = async (email: string): Promise<ISignInResult> => {
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
      return {
        success: false,
        kind: getSupabaseErrorKind(err),
        retryAfterSeconds: getRetryAfterSeconds(err)
      };
    } finally {
      isLoading.value = false;
    }
  };

  // 驗證 session
  const verifySession = async () => {
    try {
      if (!supabase) return;

      if (import.meta.server) {
        // The session comes from a request cookie, which anyone can forge: verify the JWT
        // (getClaims checks its signature) instead of trusting getSession() here.
        const { data, error: err } = await supabase.auth.getClaims();
        if (err) throw err;
        const claims = data?.claims;
        setUser(
          claims
            ? toUser({ id: claims.sub, email: claims.email, user_metadata: claims.user_metadata })
            : null,
        );
        return;
      }

      const { data: { session }, error: err } = await supabase.auth.getSession();
      
      if (err) throw err;

      setUser(session?.user ? toUser(session.user) : null);
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
    // Server: from the request's session cookie (plugins/02.auth.ts) · browser: re-check after hydration
    if (supabase) {
      await verifySession();
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