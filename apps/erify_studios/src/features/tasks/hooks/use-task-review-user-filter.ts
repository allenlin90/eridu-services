import { useAsyncComboboxFilter } from './use-async-combobox-filter';

import { getStudioMembers } from '@/features/studio-members/api/members';

const toOption = (member: { user_name: string }) => ({ value: member.user_name, label: member.user_name });

export function useTaskReviewUserFilter(studioId: string, selectedUserName?: string) {
  return useAsyncComboboxFilter({
    queryKeyBase: 'task-review-user-filter',
    studioId,
    selectedValue: selectedUserName,
    fetchList: async ({ search, limit, signal }) => {
      const response = await getStudioMembers(studioId, { search: search || undefined, limit }, { signal });
      return response.data ?? [];
    },
    fetchSelected: async ({ value, signal }) => {
      const response = await getStudioMembers(studioId, { search: value, limit: 1 }, { signal });
      return response.data?.[0];
    },
    toOption,
  });
}
