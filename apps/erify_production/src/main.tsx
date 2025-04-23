import { AuthProvider } from "@eridu/auth-service/providers/auth-provider";
import "@eridu/ui/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import App from "./app";

const baseURL = import.meta.env.VITE_AUTH_BASE_URL;

if (!baseURL) {
  throw new Error("AUTH_BASE_URL is not defined");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider baseURL={baseURL}>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
