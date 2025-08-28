import { defineConfig } from 'astro/config';
import react from '@astro/react';
import tailwind from '@astro/tailwind';

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  server: {
    port: 4322,
    host: true,
  },
  vite: {
    server: {
      proxy: {
        '/api': {
          target: process.env.BACKEND_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: process.env.BACKEND_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },
});
