import { createAuthClient } from '@eridu/auth-sdk/client/react';

import { setCachedToken } from '@/lib/api/token-store';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL,
  fetchOptions: {
    credentials: 'include',
    onResponse: async (context) => {
      const token = context.response.headers.get('set-auth-jwt');
      if (token) {
        setCachedToken(token);
      }
    },
  },
});

export type Session = Awaited<ReturnType<typeof authClient.client.getSession>>['data'];
