import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      sizes: [512],
      padding: 0.1,
      resizeOptions: { background: '#7c3aed' },
    },
    apple: {
      sizes: [180],
      padding: 0.2,
      resizeOptions: { background: '#7c3aed' },
    },
    favicon: {
      sizes: [64],
      padding: 0.1,
    },
  },
  images: ['public/icon.svg'],
});
