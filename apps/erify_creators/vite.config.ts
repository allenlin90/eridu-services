import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// Plugin to exclude test files from build (only during build, not during tests)
function excludeTests(): Plugin {
  return {
    name: 'exclude-tests',
    enforce: 'pre',
    apply: 'build', // Only apply during build, not during test/dev
    resolveId(id) {
      // Exclude test files and test directories
      if (
        id.includes('__tests__')
        || id.match(/\.(test|spec)\.(tsx?|jsx?)$/)
      ) {
        return { id, external: true };
      }
      return null;
    },
    load(id) {
      // Prevent loading test files
      if (
        id.includes('__tests__')
        || id.match(/\.(test|spec)\.(tsx?|jsx?)$/)
      ) {
        return '';
      }
      return null;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    excludeTests(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    // Removed paraglideVitePlugin - using precompile strategy instead of JIT
  ],
  resolve: {
    preserveSymlinks: false, // Required for pnpm workspaces
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    conditions: ['default', 'module', 'import'],
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['@eridu/ui', '@eridu/i18n'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/routes/**'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/routes/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/__tests__/**',
        '**/test/**',
        '**/routeTree.gen.ts',
        '**/main.tsx',
      ],
    },
  },
});
