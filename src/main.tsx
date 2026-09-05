import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Global handler for Google Maps authentication failures and Vite sandbox notices
if (typeof window !== 'undefined') {
  (window as unknown as { gm_authFailure: () => void }).gm_authFailure = () => {
    console.warn('[Google Maps Platform] Authentication check reported an invalid or unauthorized key. Graceful fallback active.');
  };

  const origError = console.error;
  console.error = (...args: unknown[]) => {
    const combined = args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ');
    if (
      combined.includes('[vite]') ||
      combined.includes('failed to connect to websocket') ||
      combined.includes('WebSocket closed without opened')
    ) {
      return;
    }
    origError.apply(console, args);
  };

  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const combined = args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ');
    if (
      combined.includes('[vite]') ||
      combined.includes('failed to connect to websocket') ||
      combined.includes('WebSocket closed without opened')
    ) {
      return;
    }
    origWarn.apply(console, args);
  };

  window.addEventListener('error', (event) => {
    const msg = (event.message || '') + (event.filename || '');
    if (
      msg.includes('InvalidKeyMapError') ||
      msg.includes('Google Maps JavaScript API error') ||
      msg.includes('maps.googleapis.com') ||
      msg.includes('WebSocket') ||
      msg.includes('websocket') ||
      msg.includes('closed without opened') ||
      msg.includes('[vite]')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = event.reason ? String(event.reason.message || event.reason) : '';
    if (
      reasonStr.includes('WebSocket') ||
      reasonStr.includes('websocket') ||
      reasonStr.includes('closed without opened') ||
      reasonStr.includes('[vite]') ||
      reasonStr.includes('failed to connect') ||
      reasonStr.includes('Illegal invocation')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

