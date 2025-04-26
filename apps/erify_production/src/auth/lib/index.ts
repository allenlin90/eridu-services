export const baseURL = import.meta.env.VITE_AUTH_BASE_URL;

if (!baseURL) {
  throw new Error("AUTH_BASE_URL is not defined");
}
