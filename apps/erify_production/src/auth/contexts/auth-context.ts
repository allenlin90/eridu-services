import { createContext } from "react";

import type { Session } from "../types";

export const AuthContext = createContext<null | {
  token: string | null;
  session: Session | null;
  error: Error | null;
  loading: boolean;
  refetch: () => Promise<void> | void;
}>(null);

export default AuthContext;
