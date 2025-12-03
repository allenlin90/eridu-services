import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import env from './src/env';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/frontend/routes',
      generatedRouteTree: './src/frontend/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    preserveSymlinks: false, // Required for pnpm workspaces
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@frontend': path.resolve(__dirname, './src/frontend'),
    },
    conditions: ['default', 'module', 'import'],
  },
  build: {
    target: 'esnext',
    outDir: 'dist/frontend',
  },
  optimizeDeps: {
    exclude: ['@eridu/ui'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  server: {
    cors: {
      origin: true,
      credentials: true,
    },
    proxy: {
      '/api': {
        target: `http://localhost:${env.PORT}`,
        changeOrigin: true,
      },
    },
  },
});
