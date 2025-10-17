import type { User } from "better-auth";

import { useCallback, useRef, useState } from "react";

import { API_ENDPOINTS } from "../constants/api-endpoints";
import { fetchClient } from "../lib/http-client";
import useSession from "./use-session";

type SignupCredentials = {
  email: string;
  password: string;
  name: string;
};

type ErrorResponse = {
  code: string;
  message: string;
};

type SignupResponse = {
  redirect: boolean;
  token: string;
  user: User;
};

export function useSignup() {
  const { baseURL, refetch } = useSession();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signalRef = useRef<AbortController | null>(null);

  const abortFetching = useCallback(() => {
    signalRef.current?.abort();
  }, []);

  const signup = useCallback(async (credentials: SignupCredentials): Promise<SignupResponse | null> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(API_ENDPOINTS.AUTH.SIGNUP.EMAIL, baseURL);
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
        throw new Error(errorData.message || "Signup failed");
      }

      // Parse the response as SignupResponse
      const data: SignupResponse = await response.json();
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
  }, [baseURL, refetch]);

  return {
    loading,
    error,
    signup,
    abortFetching,
  };
}
