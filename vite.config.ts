import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  server: {
    host: true,
    port: 3000
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
})