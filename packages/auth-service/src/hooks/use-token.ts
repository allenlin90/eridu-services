import { decodeJwt } from "jose";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Session } from "../types";

import { API_ENDPOINTS } from "../constants/api-endpoints";
import { fetchClient } from "../lib/http-client";

// TODO: implement silent refresh
export function useToken(baseURL: string) {
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
      const tokenURL = new URL(API_ENDPOINTS.AUTH.TOKEN, baseURL);
      const { token } = await fetchClient(tokenURL, {
        signal: (signalRef.current = new AbortController()).signal,
      }).then<{ token: string }>(res => res.json()) ?? {};

      if (token) {
        const decodedPayload = decodeJwt(token) as Session;

        setToken(token);
        setSession(decodedPayload);

        return token;
      }
      return null;
    }
    catch (error) {
      setError(error as Error);
      return null;
    }
    finally {
      setLoading(false);
      signalRef.current = null;
    }
  }, [baseURL]);

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
    setSession,
    token,
    abortFetching,
    refetch,
  };
}
