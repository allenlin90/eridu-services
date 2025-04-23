export const fetchToken = (endpoint: URL, options?: RequestInit) => fetch(endpoint, { credentials: "include", mode: "cors", ...options }).then<{ token: string } | null>(res => res.json());
