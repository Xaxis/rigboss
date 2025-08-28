import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://rigboss.dev',
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
  ],
  output: 'static',
  build: {
    assets: 'assets',
  },
});
