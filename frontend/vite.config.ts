import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://backend:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/similar': {
        target: 'http://backend:5000',
        changeOrigin: true,
      },
      '/search': {
        target: 'http://backend:5000',
        changeOrigin: true,
      },
      '/get-weights': {
        target: 'http://backend:5000',
        changeOrigin: true,
      },
      '/update-weights': {
        target: 'http://backend:5000',
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
})
