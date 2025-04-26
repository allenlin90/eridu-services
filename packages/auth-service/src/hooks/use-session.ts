import { useContext } from "react";

import type { AuthContextType } from "../contexts/auth-context";

import { AuthContext } from "../contexts/auth-context";

export function useSession(): AuthContextType {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useSession must be used within an AuthProvider");
  }

  return ctx;
}

export default useSession;
