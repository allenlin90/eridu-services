import type { OAuthClient } from '@better-auth/oauth-provider';
import { useCallback, useEffect, useState } from 'react';

import { authClient } from '@/frontend/features/auth/api/auth-client';

export function useOAuthClients() {
  const [clients, setClients] = useState<OAuthClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await authClient.oauth2.getClients();

      if (fetchError) {
        setError(fetchError.message || 'Failed to load OAuth clients');
      } else {
        setClients(data ?? []);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  return {
    clients,
    loading,
    error,
    refresh: loadClients,
  };
}
