import { useAsyncComboboxFilter } from './use-async-combobox-filter';

import { getClients } from '@/features/clients/api/get-clients';

const toOption = (client: { name: string }) => ({ value: client.name, label: client.name });

export function useTaskReviewClientFilter(studioId: string, selectedClientName?: string) {
  return useAsyncComboboxFilter({
    queryKeyBase: 'task-review-client-filter',
    studioId,
    selectedValue: selectedClientName,
    fetchList: async ({ search, limit, signal }) => {
      const response = await getClients({ name: search || undefined, limit }, studioId, { signal });
      return response.data ?? [];
    },
    fetchSelected: async ({ value, signal }) => {
      const response = await getClients({ name: value, limit: 1 }, studioId, { signal });
      return response.data?.[0] ?? null;
    },
    toOption,
  });
}
