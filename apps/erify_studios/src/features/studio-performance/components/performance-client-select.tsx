import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { AsyncCombobox } from '@eridu/ui';

import { getClients } from '@/features/clients/api/get-clients';
import { useShowLookupsQuery } from '@/features/shows/api/get-show-lookups';

type PerformanceClientSelectProps = {
  studioId: string;
  /** Selected client UID, or empty string for "all clients". */
  value: string;
  onChange: (clientId: string) => void;
};

/**
 * Single-client async combobox for the By-Show performance graph, mirroring the
 * shows-table client filter (same `getClients` + lookups fallback so an already
 * selected client stays labelled even when it's outside the latest search page).
 * An empty value means "all shows in range".
 */
export function PerformanceClientSelect({ studioId, value, onChange }: PerformanceClientSelectProps) {
  const [clientSearch, setClientSearch] = useState('');

  const { data: lookups } = useShowLookupsQuery(studioId);
  const { data: clientsResponse, isLoading } = useQuery({
    queryKey: ['performance-clients', studioId, clientSearch],
    queryFn: ({ signal }) => getClients({ name: clientSearch || undefined, limit: 50 }, studioId, { signal }),
    enabled: Boolean(studioId),
  });

  const selectedClient = useMemo(() => {
    return (lookups?.clients ?? []).find((c) => c.id === value);
  }, [lookups?.clients, value]);

  const clientOptions = useMemo(() => {
    const fetched = (clientsResponse?.data ?? []).map((c) => ({ value: c.id, label: c.name }));
    if (selectedClient && !fetched.some((opt) => opt.value === selectedClient.id)) {
      fetched.unshift({ value: selectedClient.id, label: selectedClient.name });
    }
    return fetched;
  }, [clientsResponse, selectedClient]);

  return (
    <AsyncCombobox
      value={value}
      onChange={onChange}
      onSearch={setClientSearch}
      options={clientOptions}
      isLoading={isLoading}
      placeholder="All clients — pick one to focus"
    />
  );
}
