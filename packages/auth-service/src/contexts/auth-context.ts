import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { createContext } from "react";

import type { Session } from "../types.ts";

const _authClient = createAuthClient({
  plugins: [
    adminClient(),
    organizationClient({ teams: { enabled: true } }),
  ],
});

// TODO: fix typing admin is any issue
export type AuthClient = typeof _authClient;

export type AuthContextType = {
  baseURL: string;
  authClient: AuthClient;
  token: string | null;
  session: Session | null;
  error: Error | null;
  loading: boolean;
  abortFetching: () => void;
  refetch: () => Promise<string | null> | string;
  signout: () => Promise<void> | void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export default AuthContext;
