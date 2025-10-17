import { useCallback, useRef, useState } from "react";

import { API_ENDPOINTS } from "../constants/api-endpoints";
import { fetchClient } from "../lib/http-client";
import useSession from "./use-session";

type MagicLinkCredentials = {
  email: string;
};

type ErrorResponse = {
  code: string;
  message: string;
};

type MagicLinkResponse = {
  message: string;
};

export function useMagicLink() {
  const { baseURL } = useSession();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signalRef = useRef<AbortController | null>(null);

  const abortFetching = useCallback(() => {
    signalRef.current?.abort();
  }, []);

  const sendMagicLink = useCallback(async (credentials: MagicLinkCredentials): Promise<MagicLinkResponse | null> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(API_ENDPOINTS.AUTH.MAGIC_LINK, baseURL);
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
        throw new Error(errorData.message || "Magic link send failed");
      }

      // Parse the response as MagicLinkResponse
      const data: MagicLinkResponse = await response.json();
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
    sendMagicLink,
    abortFetching,
  };
}
