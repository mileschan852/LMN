import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, './node_modules/react/jsx-dev-runtime'),
      'lucide-react': path.resolve(__dirname, './node_modules/lucide-react'),
      'dating-core': path.resolve(__dirname, './src/dating-core'),
      'dating-ui': path.resolve(__dirname, './src/dating-ui'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsInlineLimit: 0, // Don't inline any assets - always emit as files
  },
  server: {
    port: 3001,
    host: true,
  },
})
