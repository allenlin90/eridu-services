import { useAsyncComboboxFilter } from './use-async-combobox-filter';

import { getClients } from '@/features/clients/api/get-clients';

const toOption = (client: { id: string; name: string }) => ({ value: client.id, label: client.name });

export function useTaskReviewClientFilter(studioId: string, selectedClientId?: string) {
  return useAsyncComboboxFilter({
    queryKeyBase: 'task-review-client-filter',
    studioId,
    selectedValue: selectedClientId,
    fetchList: async ({ search, limit, signal }) => {
      const response = await getClients({ name: search || undefined, limit }, studioId, { signal });
      return response.data ?? [];
    },
    fetchSelected: async ({ value, signal }) => {
      const response = await getClients({ id: value, limit: 1 }, studioId, { signal });
      return response.data?.[0] ?? null;
    },
    toOption,
  });
}
