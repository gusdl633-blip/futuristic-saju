import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@orrery/core': resolve(__dirname, 'packages/core/src'),
    },
  },
  /** 로컬: `vercel dev`(기본 포트 3000)와 함께 `vite`를 쓸 때 API 프록시 */
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})
