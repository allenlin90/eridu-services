import { createAuthClient } from "better-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { AuthContextType } from "../contexts/auth-context";

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

  const { error, loading, session, setSession, token, abortFetching, refetch } = useToken(baseURL);

  const signout = useCallback(async () => {
    await authClient.signOut();
    setSession(null);
  }, [authClient, setSession]);

  const value = useMemo<AuthContextType>(() => ({
    abortFetching,
    authClient,
    baseURL,
    error,
    loading,
    refetch,
    signout,
    session,
    token,
  }), [
    abortFetching,
    authClient,
    baseURL,
    error,
    loading,
    refetch,
    session,
    signout,
    token,
  ]);

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
