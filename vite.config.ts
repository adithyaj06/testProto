import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const apiPort = env.API_PORT ?? '3001'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': `http://localhost:${apiPort}`,
      },
    },
  }
})
