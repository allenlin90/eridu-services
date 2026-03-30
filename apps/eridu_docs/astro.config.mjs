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
          components: {
              Search: './src/components/Search.astro',
              SocialIcons: './src/components/SocialIcons.astro',
          },
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
