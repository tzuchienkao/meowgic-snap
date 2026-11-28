import type { RouterConfig } from '@nuxt/schema';

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    if (to.hash) {
      const isSupabaseAuthHash =
        to.hash.includes('access_token=') || to.hash.includes('refresh_token=') || to.hash.includes('type=magiclink');

      if (isSupabaseAuthHash) {
        return { top: 0 };
      }

      return { el: `#${CSS.escape(to.hash.slice(1))}`, top: 0 };
    }

    return { top: 0 };
  },
};
