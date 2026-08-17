import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runContractTests } from './lib/contractTests';

// Expose contract test suite on the window object for console debugging
(window as any).runContractTests = runContractTests;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
