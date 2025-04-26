import type { User } from "better-auth";

import { useCallback, useRef, useState } from "react";

import { fetchClient } from "../lib/http-client";
import useSession from "./use-session";

type LoginCredentials = {
  email: string;
  password: string;
};

type ErrorResponse = {
  code: string;
  message: string;
};

type LoginResponse = {
  redirect: boolean;
  token: string;
  user: User;
};

export function useLogin() {
  const { baseURL, refetch } = useSession();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signalRef = useRef<AbortController | null>(null);

  const abortFetching = useCallback(() => {
    signalRef.current?.abort();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResponse | null> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL("/api/auth/sign-in/email", baseURL);
      const response = await fetchClient(fetchURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        signal: (signalRef.current = new AbortController()).signal,
      });

      // Check if the response is OK
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      // Parse the response as LoginResponse
      const data: LoginResponse = await response.json();
      await refetch();
      return data;
    }
    catch (err) {
      setError((err as Error).message);
      return null;
    }
    finally {
      setLoading(false);
      signalRef.current = null;
    }
  }, [baseURL]);

  return {
    loading,
    error,
    login,
    abortFetching,
  };
}
