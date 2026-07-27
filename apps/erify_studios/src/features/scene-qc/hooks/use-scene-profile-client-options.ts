import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getClients } from '@/features/clients/api/get-clients';

/**
 * Client selector options for the Scene Profile manager. Mirrors the exact
 * `useQuery(['studio-clients', studioId, clientSearch], ...)` + clientOptions
 * memo pattern from `routes/studios/$studioId/client-mechanics/index.tsx`.
 * Does NOT auto-default to the first client -- the manager begins with a
 * required Client selector, unlike the mechanics list.
 */
export function useSceneProfileClientOptions(studioId: string, selectedClientId: string | undefined) {
  const [clientSearch, setClientSearch] = useState('');
  const clientsQuery = useQuery({
    queryKey: ['studio-clients', studioId, clientSearch],
    queryFn: ({ signal }) => getClients({ name: clientSearch || undefined, limit: 50 }, studioId, { signal }),
    enabled: Boolean(studioId),
  });

  const clients = useMemo(() => clientsQuery.data?.data ?? [], [clientsQuery.data]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId],
  );

  const clientOptions = useMemo(() => {
    const fetched = clients.map((c) => ({ value: c.id, label: c.name }));
    if (selectedClient && !fetched.some((opt) => opt.value === selectedClient.id)) {
      fetched.unshift({ value: selectedClient.id, label: selectedClient.name });
    }
    return fetched;
  }, [clients, selectedClient]);

  return {
    clientOptions,
    selectedClient,
    isLoading: clientsQuery.isLoading,
    setClientSearch,
  };
}
