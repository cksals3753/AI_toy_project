import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      deny: [
        '.env',
        '.env.*',
        '*.{crt,pem,key,p12,pfx,cer,der}',
        '.npmrc',
        '.yarnrc.yml',
        '**/.git/**',
        '**/server/**',
        '**/docs/**',
      ],
    },
    proxy: { '/api/chat': { target: process.env.CHAT_API_TARGET || 'http://127.0.0.1:3001' } },
  },
})
