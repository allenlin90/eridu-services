import { useQuery } from '@tanstack/react-query';

import type { StudioShowDetail } from '../api/get-studio-show';
import { getStudioShow, studioShowKeys } from '../api/get-studio-show';

type UseStudioShowProps = {
  studioId: string;
  showId: string;
  enabled?: boolean;
  initialData?: StudioShowDetail;
  initialDataUpdatedAt?: number;
};

export function useStudioShow({
  studioId,
  showId,
  enabled = true,
  initialData,
  initialDataUpdatedAt,
}: UseStudioShowProps) {
  return useQuery({
    queryKey: studioShowKeys.detail(studioId, showId),
    queryFn: ({ signal }) => getStudioShow(studioId, showId, { signal }),
    enabled: enabled && !!studioId && !!showId,
    initialData,
    initialDataUpdatedAt,
    refetchOnWindowFocus: false,
  });
}
