import { createAuthClient } from "better-auth/react";
import React, { useEffect, useMemo, useState } from "react";

import { AuthContext } from "../contexts/auth-context";
import { useToken } from "../hooks/use-token";

type AuthProviderProps = {
  baseURL: string;
  errorhandler?: <T extends Error>(error: T) => void | Promise<void>;
};

export const AuthProvider: React.FC<React.PropsWithChildren<AuthProviderProps>> = ({
  baseURL,
  children,
  errorhandler,
}) => {
  const [authClient] = useState(() => createAuthClient({ baseURL }));

  const { error, loading, session, token, abortFetching, refetch } = useToken(baseURL);
  const value = useMemo(() => ({ authClient, baseURL, token, session, loading, error, abortFetching, refetch }), [authClient, baseURL, loading, error, token, session, refetch]);

  useEffect(() => {
    if (error) {
      errorhandler?.(error);
    }
  }, [error, errorhandler]);

  return (
    <AuthContext value={value}>
      {children}
    </AuthContext>
  );
};
