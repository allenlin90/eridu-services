import { useAsyncComboboxFilter } from './use-async-combobox-filter';

import { getStudioShows } from '@/features/studio-shows/api/get-studio-shows';

const toOption = (show: { name: string }) => ({ value: show.name, label: show.name });

export function useTaskReviewShowFilter(studioId: string, selectedShowName?: string) {
  return useAsyncComboboxFilter({
    queryKeyBase: 'task-review-show-filter',
    studioId,
    selectedValue: selectedShowName,
    fetchList: async ({ search, limit, signal }) => {
      const response = await getStudioShows(studioId, { search: search || undefined, limit }, { signal });
      return response.data ?? [];
    },
    fetchSelected: async ({ value, signal }) => {
      const response = await getStudioShows(studioId, { search: value, limit: 1 }, { signal });
      return response.data?.[0] ?? null;
    },
    toOption,
  });
}
