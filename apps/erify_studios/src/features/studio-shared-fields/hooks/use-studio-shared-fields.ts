import { useQuery } from '@tanstack/react-query';

import { getStudioSharedFields } from '../api/get-studio-shared-fields';
import { studioSharedFieldsKeys } from '../api/keys';

type UseStudioSharedFieldsParams = {
  studioId: string;
};

export function useStudioSharedFields({ studioId }: UseStudioSharedFieldsParams) {
  return useQuery({
    queryKey: studioSharedFieldsKeys.detail(studioId),
    queryFn: ({ signal }) => getStudioSharedFields(studioId, { signal }),
    // Shared fields can be changed in settings just before opening template builder.
    // Always revalidate on mount to avoid stale insertion options.
    refetchOnMount: 'always',
  });
}
