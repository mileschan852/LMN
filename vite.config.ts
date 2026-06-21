import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/LMN/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.GITHUB_RUN_NUMBER || 'dev'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@dating/core': path.resolve(__dirname, './src/dating-core/index.ts'),
      '@dating/ui': path.resolve(__dirname, './src/dating-ui/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsInlineLimit: 0,
  },
  server: {
    port: 3001,
    host: true,
  },
})
