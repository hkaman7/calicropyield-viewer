import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the built assets work under GitHub Pages' project-repo
  // subpath (https://<user>.github.io/calicropyield-viewer/) without hardcoding
  // the repo name here.
  base: './',
})
