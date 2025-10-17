import { useCallback, useRef, useState } from "react";

import type { User } from "../types";

import { API_ENDPOINTS } from "../constants/api-endpoints";
import { fetchClient } from "../lib/http-client";
import useSession from "./use-session";

type CreateUserData = {
  email: string;
  password: string;
  name: string;
  role?: string;
};

type UpdateUserData = {
  userId: string;
  email?: string;
  name?: string;
  role?: string;
};

type ErrorResponse = {
  code: string;
  message: string;
};

type ImpersonateResponse = {
  message: string;
  user: User;
};

export function useAdmin() {
  const { baseURL, refetch } = useSession();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signalRef = useRef<AbortController | null>(null);

  const abortFetching = useCallback(() => {
    signalRef.current?.abort();
  }, []);

  const impersonate = useCallback(async (userId: string): Promise<ImpersonateResponse | null> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(API_ENDPOINTS.AUTH.ADMIN.IMPERSONATE, baseURL);
      const response = await fetchClient(fetchURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
        signal: (signalRef.current = new AbortController()).signal,
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || "Failed to impersonate user");
      }

      const result: ImpersonateResponse = await response.json();
      await refetch();
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
  }, [baseURL, refetch]);

  const stopImpersonating = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(API_ENDPOINTS.AUTH.ADMIN.STOP_IMPERSONATING, baseURL);
      const response = await fetchClient(fetchURL, {
        method: "POST",
        signal: (signalRef.current = new AbortController()).signal,
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || "Failed to stop impersonating");
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

  const createUser = useCallback(async (data: CreateUserData): Promise<User | null> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(API_ENDPOINTS.AUTH.ADMIN.CREATE_USER, baseURL);
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
        throw new Error(errorData.message || "Failed to create user");
      }

      const user: User = await response.json();
      return user;
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

  const updateUser = useCallback(async (data: UpdateUserData): Promise<User | null> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(API_ENDPOINTS.AUTH.ADMIN.UPDATE_USER, baseURL);
      const response = await fetchClient(fetchURL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        signal: (signalRef.current = new AbortController()).signal,
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || "Failed to update user");
      }

      const user: User = await response.json();
      return user;
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

  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(`${API_ENDPOINTS.AUTH.ADMIN.DELETE_USER}/${userId}`, baseURL);
      const response = await fetchClient(fetchURL, {
        method: "DELETE",
        signal: (signalRef.current = new AbortController()).signal,
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
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
    impersonate,
    stopImpersonating,
    createUser,
    updateUser,
    deleteUser,
    abortFetching,
  };
}
