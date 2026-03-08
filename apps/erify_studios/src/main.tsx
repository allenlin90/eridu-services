import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { registerSW } from 'virtual:pwa-register';

import './index.css';

import { createIDBPersister, queryClient } from '@/lib/api';
import { router } from '@/router';

// Create IndexedDB persister for offline support
const persister = createIDBPersister();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
      {/* DevTools only in development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </PersistQueryClientProvider>
  </StrictMode>,
);

const updateSW = registerSW({
  immediate: false,
  onRegisterError(error) {
    console.error('PWA service worker registration failed', error);
  },
});

if (import.meta.env.PROD) {
  void updateSW();
}
