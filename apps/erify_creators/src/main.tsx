import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';

import { initI18n } from '@/i18n';
import { createIDBPersister, queryClient } from '@/lib/api';
import { initializePwaShell } from '@/lib/pwa';
import { router } from '@/router';

initI18n();
initializePwaShell();

// Create IndexedDB persister for offline support
const persister = createIDBPersister();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <RouterProvider router={router} />
      {/* DevTools only in development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </PersistQueryClientProvider>
  </StrictMode>,
);
