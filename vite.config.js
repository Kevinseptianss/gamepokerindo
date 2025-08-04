import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    target: 'es2015'
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
})
