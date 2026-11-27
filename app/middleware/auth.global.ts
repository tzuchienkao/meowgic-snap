import { MEMBER_ROUTE_NAMES, RouteName } from '~/constants/navigation';
import { useAuth } from '~/composables/useAuth';

/**
 * Member-only pages (儀表板, 紀錄, 設定): a guest who opens one is sent to the home page, which has 登入.
 * On the server `user` comes from the session cookie (plugins/02.auth.ts runs before this), so the
 * redirect happens before any member page is rendered.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (!MEMBER_ROUTE_NAMES.includes(to.name as RouteName)) return;
  if (!useAuth().isAuthenticated.value) return navigateTo({ name: RouteName.Index });
});
