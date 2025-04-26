import type { createAuthClient } from "better-auth/react";

import { createContext } from "react";

import type { Session } from "../types.ts";

export const AuthContext = createContext<null | {
  baseURL: string;
  authClient: ReturnType<typeof createAuthClient>;
  token: string | null;
  session: Session | null;
  error: Error | null;
  loading: boolean;
  refetch: () => Promise<void> | void;
  abortFetching: () => void;
}>(null);

export default AuthContext;
