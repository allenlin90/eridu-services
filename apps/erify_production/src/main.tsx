import { baseURL } from "@/auth/lib";
import "@eridu/ui/globals.css";
import { AuthProvider } from "@eridu/auth-service/providers/auth-provider";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import App from "./app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider baseURL={baseURL}>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
