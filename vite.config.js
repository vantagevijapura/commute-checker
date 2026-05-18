import { defineConfig } from 'vite'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [cloudflare()],
  server: {
    proxy: {
      '/here-transit': {
        target: 'https://transit.router.hereapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/here-transit/, ''),
      },
    },
  },
})