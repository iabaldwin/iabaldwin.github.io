import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use BASE_PATH env for GitHub Pages (e.g., /repo-name/). Defaults to '/'.
  base: process.env.BASE_PATH ?? '/',
})
