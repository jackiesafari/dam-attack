import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'build'],
    setupFiles: ['./src/test-setup.ts']
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});