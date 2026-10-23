import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  build: { sourcemap: false },
  define:
    mode === 'playtest'
      ? {
          'import.meta.env.VITE_AI_CHAT_ENABLED': JSON.stringify('false'),
          'import.meta.env.VITE_FIRST_ROOM_3D': JSON.stringify('true'),
        }
      : {},
  plugins: [react(), tailwindcss()],
  preview: { proxy: {} },
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
        '**/backend/**',
        '**/docs/**',
      ],
    },
    proxy: { '/api/chat': { target: process.env.CHAT_API_TARGET || 'http://127.0.0.1:3001' } },
  },
}))
