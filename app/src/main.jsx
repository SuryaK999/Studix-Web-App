import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BrowserRouter } from 'react-router-dom';

window.addEventListener("unhandledrejection", (e) => {
  console.error("UNHANDLED PROMISE:", e.reason);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
