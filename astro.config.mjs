import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind(),
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  server: {
    port: 3000,
    host: true, // Allow external connections for Raspberry Pi deployment
  },
  vite: {
    define: {
      __BACKEND_URL__: JSON.stringify(process.env.BACKEND_URL || 'http://localhost:3001'),
    },
  },
});
