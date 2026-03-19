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
  });
}
