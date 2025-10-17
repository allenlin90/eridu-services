import { useCallback, useRef, useState } from "react";

import { API_ENDPOINTS } from "../constants/api-endpoints";
import { fetchClient } from "../lib/http-client";
import useSession from "./use-session";

type SendVerificationData = {
  email: string;
};

type VerifyEmailData = {
  token: string;
};

type ErrorResponse = {
  code: string;
  message: string;
};

type SendVerificationResponse = {
  message: string;
};

export function useEmailVerification() {
  const { baseURL, refetch } = useSession();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signalRef = useRef<AbortController | null>(null);

  const abortFetching = useCallback(() => {
    signalRef.current?.abort();
  }, []);

  const sendVerification = useCallback(async (data: SendVerificationData): Promise<SendVerificationResponse | null> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(API_ENDPOINTS.AUTH.SEND_VERIFICATION, baseURL);
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
        throw new Error(errorData.message || "Failed to send verification email");
      }

      const result: SendVerificationResponse = await response.json();
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

  const verifyEmail = useCallback(async (data: VerifyEmailData): Promise<boolean> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(API_ENDPOINTS.AUTH.VERIFY_EMAIL, baseURL);
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
        throw new Error(errorData.message || "Failed to verify email");
      }

      await refetch();
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
  }, [baseURL, refetch]);

  return {
    loading,
    error,
    sendVerification,
    verifyEmail,
    abortFetching,
  };
}
