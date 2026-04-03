// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

const isPagefindSnapshotBuild = process.env.PAGEFIND_SNAPSHOT_BUILD === 'true';

// https://astro.build/config
export default defineConfig({
  outDir: isPagefindSnapshotBuild ? './dist-pagefind-snapshot' : './dist',
  output: 'server',
  integrations: [
      starlight({
          prerender: isPagefindSnapshotBuild,
          pagefind: false,
          title: 'Eridu Knowledge Base',
          favicon: '/favicon.png',
          components: {
              Search: './src/components/Search.astro',
              SocialIcons: './src/components/SocialIcons.astro',
          },
          sidebar: [
              {
                  label: 'Getting Started',
                  autogenerate: { directory: 'getting-started' },
              },
              {
                  label: 'Scheduling & Shows',
                  autogenerate: { directory: 'scheduling' },
              },
              {
                  label: 'Assets & Uploads',
                  autogenerate: { directory: 'assets' },
              },
              {
                  label: 'Reference',
                  autogenerate: { directory: 'reference' },
              },
          ],
      }),
      mdx(),
      mermaid(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: node({
    mode: 'standalone',
  }),
});
