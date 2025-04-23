const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL;

if (!AUTH_BASE_URL) {
  throw new Error("Missing auth base URL");
}

const jwtEndpoint = new URL(`${AUTH_BASE_URL}/api/auth/token`);

export const fetchToken = (options?: RequestInit) => fetch(jwtEndpoint, { credentials: "include", mode: "cors", ...options }).then<{ token: string } | null>(res => res.json());
