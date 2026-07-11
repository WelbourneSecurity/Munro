import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { registerServiceWorker } from './pwa';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Munro app root was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Production-only: installs the offline app shell, no-op in dev and tests.
registerServiceWorker();
