import { getClients } from '@/features/clients/api/get-clients';
import { useAsyncComboboxFilter } from '@/features/tasks/hooks/use-async-combobox-filter';

function toOption(client: { id: string; name: string }) {
  return {
    value: client.id,
    label: client.name,
  };
}

export function useSceneReviewClientFilter(studioId: string, selectedClientId?: string) {
  return useAsyncComboboxFilter({
    queryKeyBase: 'scene-review-client-filter',
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
