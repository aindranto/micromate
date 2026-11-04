import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runContractTests } from './lib/contractTests';
import { registerSW } from 'virtual:pwa-register';

// Expose contract test suite on the window object for console debugging
(window as any).runContractTests = runContractTests;

// PWA: register the service worker with a prompt strategy, not auto-update.
// When a new version is ready, App.tsx shows a banner and the user chooses
// when to reload. This matters because a forced reload while the sync queue
// still holds unsent changes could obscure the sync status.
const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('micromate:pwa-update'));
  },
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('micromate:pwa-ready'));
  },
});
(window as any).micromatePWAUpdate = updateSW;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
