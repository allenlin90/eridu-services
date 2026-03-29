// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [
      starlight({
          title: 'Eridu Knowledge Base',
          sidebar: [
              {
                  label: 'Features',
                  autogenerate: { directory: 'features' },
              },
              {
                  label: 'Workflows & Standards',
                  autogenerate: { directory: 'workflows' },
              },
              {
                  label: 'Upcoming Releases (PRDs)',
                  autogenerate: { directory: 'upcoming' },
              },
          ],
      }),
      mermaid(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: node({
    mode: 'standalone',
  }),
});