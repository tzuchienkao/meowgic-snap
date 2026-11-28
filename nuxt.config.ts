import tailwindcss from '@tailwindcss/vite';
import { SITE_TITLE } from './app/constants/site';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Content-Security-Policy (production only: the dev server needs Vite's inline scripts and HMR
 * websocket). Nuxt and nuxt-gtag write inline <script>s, so script-src needs 'unsafe-inline';
 * the rest is limited to Supabase, Google Fonts, Google Analytics and Cloudflare Turnstile. frame-ancestors 'none' stops
 * other sites from framing the app (clickjacking).
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
  // Cloudflare Turnstile (人機驗證 in the 登入 dialog) runs in an iframe
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  ...(isProduction && {
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
    'Strict-Transport-Security': 'max-age=31536000',
  }),
};

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['nuxt-gtag'],

  // GA4: the ID comes from NUXT_PUBLIC_GTAG_ID at runtime (set it only in Cloudflare Pages' Production env)
  gtag: {
    enabled: isProduction,
  },
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: SITE_TITLE,
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Chiron+GoRound+TC:wght@200..900&display=swap',
        },
      ],
    },
  },

  nitro: {
    preset: 'cloudflare-pages',
  },

  routeRules: {
    '/**': { headers: SECURITY_HEADERS },
  },

  runtimeConfig: {
    // No service role key: nothing on the server needs to bypass RLS, so the app never loads it
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      // Cloudflare Turnstile site key (public); empty → no captcha (Supabase's Captcha protection off)
      turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || '',
    },
  },

  vite: {
    plugins: [tailwindcss()],
    // Dev only: pre-bundle at startup instead of discovering it on the first page load (which reloads the page)
    optimizeDeps: {
      include: ['@supabase/ssr'],
    },
  },
});
