import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5174,
    open: true,
    proxy: {
      '/api/forecast': {
        target: 'https://prices.fly.dev',
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, 'http://localhost');
          const region = url.searchParams.get('region') ?? '';
          return `/api/${region}/?format=json`;
        },
      },
    },
  },
  base: '/',
});
