import { createAuthClient } from "better-auth/react";

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL;

if (!AUTH_BASE_URL) {
  throw new Error("Missing Publishable Key");
}

export const { useSession } = createAuthClient({
  baseURL: AUTH_BASE_URL,
});

export default useSession;
