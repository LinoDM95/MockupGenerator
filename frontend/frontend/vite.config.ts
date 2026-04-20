import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** Repo-Root: `frontend/frontend` → zwei Ebenen hoch (Zugriff auf companion_app/ENGINE_VERSION). */
const REPO_ROOT = path.resolve(__dirname, '../..')

/** Gleiche Origin wie Vite → kein CORS; Ziel ist MockupLocalEngine / uvicorn auf 8001 */
const companionProxy = {
  target: 'http://127.0.0.1:8001',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/__companion/, ''),
} as const

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Production: Django/WhiteNoise serviert Assets unter STATIC_URL (/static/).
  base: command === 'build' ? '/static/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    fs: {
      allow: [REPO_ROOT],
    },
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/__companion': companionProxy,
    },
  },
  preview: {
    proxy: {
      '/__companion': companionProxy,
    },
  },
}))
