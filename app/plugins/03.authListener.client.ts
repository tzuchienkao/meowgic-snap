import { MEMBER_ROUTE_NAMES, RouteName } from '~/constants/navigation';
import { useAuth } from '~/composables/useAuth';
import { usePreferences } from '~/composables/usePreferences';

/**
 * Keep `user` in step with Supabase after start-up: a login / logout in another tab, a session
 * that expires or is revoked, or a refreshed token. (The first session is handled by app.vue's
 * initAuth, so INITIAL_SESSION is skipped.)
 * - signed out → leave a member-only page for the home page (the route middleware only runs on
 *   navigation);
 * - someone else (or someone) signed in → load their 偏好設定.
 * Supabase runs this callback while it holds its auth lock, so other Supabase calls (getUser in
 * loadPreferences) are deferred with setTimeout instead of awaited here.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const supabase = nuxtApp.$supabase;
  if (!supabase) return;

  const { user, setSessionUser } = useAuth();
  const { loadPreferences } = usePreferences();
  const router = useRouter();

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return;

    const previousId = user.value?.id ?? null;
    setSessionUser(session?.user ?? null);
    const currentId = user.value?.id ?? null;
    if (currentId === previousId) return;

    setTimeout(() => {
      nuxtApp.runWithContext(async () => {
        if (currentId) {
          await loadPreferences();
          return;
        }
        const routeName = router.currentRoute.value.name as RouteName;
        if (MEMBER_ROUTE_NAMES.includes(routeName)) await router.push({ name: RouteName.Index });
      });
    }, 0);
  });
});
