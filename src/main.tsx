import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import './index.css'
import App from './App.tsx'

const bootstrap = async () => {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass' })
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap().catch(error => {
  console.error('Application startup failed', error)
  document.getElementById('root')!.textContent = '앱을 시작하지 못했어요. 새로고침해주세요.'
})
