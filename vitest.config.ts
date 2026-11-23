import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    // Tests run in happy-dom (a browser environment), so Nuxt's client flag is true.
    // Vitest's `define` does not replace import.meta.client, so substitute it here.
    {
      name: 'nuxt-import-meta-client',
      transform(code, id) {
        if (!id.includes('/node_modules/') && code.includes('import.meta.client')) {
          return code.replaceAll('import.meta.client', 'true');
        }
      }
    }
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['app/**/*.test.ts', 'app/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', '.nuxt', '.output']
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './'),
      '@': path.resolve(__dirname, './app')
    }
  }
});
