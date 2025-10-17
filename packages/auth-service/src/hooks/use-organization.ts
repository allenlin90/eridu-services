import { useCallback, useRef, useState } from "react";

import type { Invitation, Organization } from "../types";

import { API_ENDPOINTS } from "../constants/api-endpoints";
import { fetchClient } from "../lib/http-client";
import useSession from "./use-session";

type CreateOrganizationData = {
  name: string;
  slug: string;
  logo?: string;
};

type InviteMemberData = {
  email: string;
  role: string;
  organizationId: string;
  teamId?: string;
};

type ErrorResponse = {
  code: string;
  message: string;
};

export function useOrganization() {
  const { baseURL, refetch } = useSession();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signalRef = useRef<AbortController | null>(null);

  const abortFetching = useCallback(() => {
    signalRef.current?.abort();
  }, []);

  const createOrganization = useCallback(async (data: CreateOrganizationData): Promise<Organization | null> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(API_ENDPOINTS.AUTH.ORGANIZATION.CREATE, baseURL);
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
        throw new Error(errorData.message || "Failed to create organization");
      }

      const organization: Organization = await response.json();
      await refetch();
      return organization;
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

  const inviteMember = useCallback(async (data: InviteMemberData): Promise<Invitation | null> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(API_ENDPOINTS.AUTH.ORGANIZATION.INVITE, baseURL);
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
        throw new Error(errorData.message || "Failed to invite member");
      }

      const invitation: Invitation = await response.json();
      return invitation;
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

  const acceptInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(`${API_ENDPOINTS.AUTH.ORGANIZATION.ACCEPT_INVITATION}/${invitationId}`, baseURL);
      const response = await fetchClient(fetchURL, {
        method: "POST",
        signal: (signalRef.current = new AbortController()).signal,
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || "Failed to accept invitation");
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

  const rejectInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    signalRef.current?.abort();

    try {
      const fetchURL = new URL(`${API_ENDPOINTS.AUTH.ORGANIZATION.REJECT_INVITATION}/${invitationId}`, baseURL);
      const response = await fetchClient(fetchURL, {
        method: "POST",
        signal: (signalRef.current = new AbortController()).signal,
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || "Failed to reject invitation");
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
    createOrganization,
    inviteMember,
    acceptInvitation,
    rejectInvitation,
    abortFetching,
  };
}
