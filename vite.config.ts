import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the code using 'process.env.API_KEY' to work in the browser
    // by replacing it with the Vite-compatible env variable at build time.
    'process.env.API_KEY': 'import.meta.env.VITE_API_KEY'
  }
})