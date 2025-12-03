import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { authClient, type Session } from '@/lib/auth';

type SessionContextType = {
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  checkSession: () => Promise<Session | null>;
  refreshSession: () => Promise<Session | null>;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

type SessionProviderProps = {
  children: ReactNode;
};

export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkSession = useCallback(async (): Promise<Session | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await authClient.client.getSession();
      const newSession = result.data;

      setSession(newSession);
      return newSession;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to check session');
      setError(error);
      setSession(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<Session | null> => {
    // Force a fresh session check by clearing any cached data if possible
    try {
      setIsLoading(true);
      setError(null);

      // Get fresh session from server
      const result = await authClient.client.getSession();
      const newSession = result.data;

      setSession(newSession);
      return newSession;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh session');
      setError(error);
      setSession(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  const value: SessionContextType = useMemo(() => ({
    session,
    isLoading,
    error,
    checkSession,
    refreshSession,
    clearSession,
  }), [session, isLoading, error, checkSession, refreshSession, clearSession]);

  return (
    <SessionContext value={value}>
      {children}
    </SessionContext>
  );
}

// eslint-disable-next-line
export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
