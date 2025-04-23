const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL;

if (!AUTH_BASE_URL) {
  throw new Error("Missing auth base URL");
}

const jwksEndpoint = new URL(`${AUTH_BASE_URL}/api/auth/jwks`);

export const fetchJwks = async (options?: RequestInit) => fetch(jwksEndpoint, { ...options }).then(res => res.json());
