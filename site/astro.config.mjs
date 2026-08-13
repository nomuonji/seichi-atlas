import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://seichi.antonbase.com',
  output: 'static',
  integrations: [sitemap({
    filter: (page) => !page.includes('/map/'),
  })],
  build: {
    assets: '_assets'
  },
  vite: {
    server: {
      fs: {
        allow: ['..']
      }
    }
  }
});
