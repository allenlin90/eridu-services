import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    preserveSymlinks: false, // Required for pnpm workspaces
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    conditions: ['default', 'module'],
  },
  optimizeDeps: {
    exclude: ['@eridu/ui'], // Exclude UI package from pre-bundling for JIT compilation
  },
});
