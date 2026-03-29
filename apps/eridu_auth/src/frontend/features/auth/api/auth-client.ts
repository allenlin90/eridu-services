import { adminClient, jwtClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import env from '../../../utils/env';

export const authClient = createAuthClient({
  baseURL: `${env.VITE_BETTER_AUTH_URL || window.location.origin}/api/auth`,
  plugins: [adminClient(), jwtClient()],
});
