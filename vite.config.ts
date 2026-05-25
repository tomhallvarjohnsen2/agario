import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves from /repo-name/ — base must match.
// Set VITE_BASE_URL in the Actions workflow; falls back to '/' for local dev.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_URL ?? '/',
})
