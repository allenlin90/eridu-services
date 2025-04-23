import { useContext } from "react";

import { AuthContext } from "../contexts/auth-context";

export function useSession() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useSession must be used within an AuthProvider");
  }

  return ctx;
}

export default useSession;
