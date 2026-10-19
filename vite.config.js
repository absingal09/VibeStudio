import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import chatApi from './server/chat-api.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'SARVAM_')
  process.env.SARVAM_API_KEY = env.SARVAM_API_KEY ?? ''

  return {
    plugins: [react(), chatApi()],
  }
})
