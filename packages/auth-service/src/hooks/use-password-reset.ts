import { useCallback, useRef, useState } from "react";

import { API_ENDPOINTS } from "../constants/api-endpoints";
import { fetchClient } from "../lib/http-client";
import useSession from "./use-session";

type ForgotPasswordData = {
  email: string;
};

type ResetPasswordData = {
  token: string;
  password: string;
};

type ErrorResponse = {
  code: string;
  message: string;
};

type ForgotPasswordResponse = {
  message: string;
};

export function usePasswordReset() {
  const { baseURL } = useSession();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signalRef = useRef<AbortController | null>(null);

  const abortFetching = useCallback(() => {
    signalRef.current?.abort();
  }, []);

  const forgotPassword = useCallback(async (data: ForgotPasswordData): Promise<ForgotPasswordResponse | null> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, baseURL);
      const response = await fetchClient(fetchURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        signal: (signalRef.current = new AbortController()).signal,
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || "Failed to send password reset email");
      }

      const result: ForgotPasswordResponse = await response.json();
      return result;
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

  const resetPassword = useCallback(async (data: ResetPasswordData): Promise<boolean> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(API_ENDPOINTS.AUTH.RESET_PASSWORD, baseURL);
      const response = await fetchClient(fetchURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        signal: (signalRef.current = new AbortController()).signal,
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || "Failed to reset password");
      }

      return true;
    }
    catch (err) {
      setError((err as Error).message);
      return false;
    }
    finally {
      setLoading(false);
      signalRef.current = null;
    }
  }, [baseURL]);

  return {
    loading,
    error,
    forgotPassword,
    resetPassword,
    abortFetching,
  };
}
