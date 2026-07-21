import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: base must match your GitHub repo name for GitHub Pages routing
// e.g. if your repo is github.com/squaresthetics/lichess-puzzle-explorer,
// base should be '/lichess-puzzle-explorer/'
export default defineConfig({
  plugins: [react()],
  base: '/lichess-puzzle-explorer/',
})
