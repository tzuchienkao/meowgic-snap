import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
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
