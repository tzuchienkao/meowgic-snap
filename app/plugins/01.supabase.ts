import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { parseCookies, setCookie, setResponseHeader } from 'h3';

/**
 * Supabase client on both sides, with the session kept in cookies (@supabase/ssr):
 * - server: reads the request's cookies, so SSR knows who is signed in (02.auth.ts) and renders
 *   the member layout straight away instead of flashing the guest one; refreshed tokens are
 *   written back as Set-Cookie;
 * - browser: reads / writes the same cookies through document.cookie.
 */
export default defineNuxtPlugin(() => {
  const { supabaseUrl, supabaseKey } = useRuntimeConfig().public;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Supabase Plugin] 缺少認證資訊!', { url: !!supabaseUrl, key: !!supabaseKey });
    return {};
  }

  if (import.meta.server) {
    const event = useRequestEvent()!;
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => Object.entries(parseCookies(event)).map(([name, value]) => ({ name, value })),
        setAll: (cookies, headers) => {
          cookies.forEach(({ name, value, options }) => setCookie(event, name, value, options));
          // e.g. Cache-Control: private, so a CDN never caches a response carrying someone's session
          Object.entries(headers ?? {}).forEach(([name, value]) => setResponseHeader(event, name, value));
        },
      },
    });
    return { provide: { supabase } };
  }

  return { provide: { supabase: createBrowserClient(supabaseUrl, supabaseKey) } };
});
