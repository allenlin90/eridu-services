import type { createAuthClient } from "better-auth/react";

import { createContext } from "react";

import type { Session } from "../types.ts";

export type AuthContextType = {
  baseURL: string;
  authClient: ReturnType<typeof createAuthClient>;
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
