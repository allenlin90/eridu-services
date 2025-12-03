import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import React from 'react';

import { routeTree } from '../routeTree.gen';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Create a router instance
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Create a wrapper component that includes all necessary providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router}>
        {children}
      </RouterProvider>
    </QueryClientProvider>
  );
}

// Create a simpler wrapper for components that only need QueryClient
function QueryClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Custom render function that includes the wrapper
export function renderWithProviders(ui: ReactElement) {
  return render(ui, { wrapper: TestWrapper });
}

// Custom render function that only includes QueryClient
export function renderWithQueryClient(ui: ReactElement) {
  return render(ui, { wrapper: QueryClientWrapper });
}
