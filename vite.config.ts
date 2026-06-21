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
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: /^@dating\/core(\/.+)?$/, replacement: path.resolve(__dirname, './src/dating-core$1') },
      { find: '@dating/ui', replacement: path.resolve(__dirname, './src/dating-ui/index.ts') },
    ],
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
