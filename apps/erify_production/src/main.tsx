import { baseURL } from "@/auth/lib";
import "@eridu/ui/globals.css";
import { createIDBPersister } from "@/lib/create-idb-persister";
import { AuthProvider } from "@eridu/auth-service/providers/auth-provider";
import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import App from "./app";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const idbPersister = createIDBPersister();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: idbPersister }}
      >
        <AuthProvider baseURL={baseURL}>
          <App />
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </PersistQueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
