import { decodeJwt } from "jose";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Session } from "../types";

import { fetchToken } from "../services/fetch-token.service";

export function useToken(tokenUrl: URL) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const signalRef = useRef<AbortController>(null);
  const initRef = useRef(false);

  const abortFetching = useCallback(() => {
    signalRef.current?.abort();
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const { token } = await fetchToken(tokenUrl, {
        signal: (signalRef.current = new AbortController()).signal,
      }) ?? {};

      if (token) {
        const decodedPayload = decodeJwt(token) as Session;

        setToken(token);
        setSession(decodedPayload);
      }
    }
    catch (error) {
      setError(error as Error);
    }
    finally {
      setLoading(false);
      signalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!initRef.current) {
      refetch();
      initRef.current = true;
    }
  }, [refetch]);

  return {
    loading,
    error,
    session,
    token,
    abortFetching,
    refetch,
  };
}
