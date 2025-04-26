export const fetchClient = (endpoint: URL | string, options?: RequestInit) => fetch(endpoint, { credentials: "include", mode: "cors", ...options });
