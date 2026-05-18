import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [],
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
