import tailwindcss from '@tailwindcss/vite';
import { SITE_TITLE } from './app/constants/site';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['nuxt-gtag'],

  // GA4: the ID comes from NUXT_PUBLIC_GTAG_ID at runtime (set it only in Cloudflare Pages' Production env)
  gtag: {
    enabled: process.env.NODE_ENV === 'production',
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

  runtimeConfig: {
    supabaseSecretKey: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY,
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
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
