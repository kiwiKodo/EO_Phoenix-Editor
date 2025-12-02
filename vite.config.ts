import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import os from 'os'

// Put Vite's cache outside the project directory (OneDrive) to avoid
// file-lock/rmdir EPERM issues on Windows when OneDrive or other agents
// interfere with node_modules/.vite. Using the OS temp directory is safe
// and avoids repeated re-optimization errors.
export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  // cacheDir can be set to any writable directory outside OneDrive.
  cacheDir: path.resolve(os.tmpdir(), 'eo-phoenix-editor-vite'),
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  }
})