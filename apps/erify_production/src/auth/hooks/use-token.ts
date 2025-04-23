import { decodeJwt } from "jose";
import { useCallback, useEffect, useState } from "react";

import type { Session } from "../types";

import { fetchToken } from "../services/fetch-token.service";

export const useToken = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { token } = await fetchToken() ?? {};

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
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    loading,
    error,
    session,
    token,
    refetch,
  };
};
