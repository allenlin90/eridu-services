import { useQuery } from '@tanstack/react-query';

import type { StudioShowDetail } from '../api/get-studio-show';
import { getStudioShow, studioShowKeys } from '../api/get-studio-show';

type UseStudioShowProps = {
  studioId: string;
  showId: string;
  enabled?: boolean;
  initialData?: StudioShowDetail;
};

export function useStudioShow({
  studioId,
  showId,
  enabled = true,
  initialData,
}: UseStudioShowProps) {
  return useQuery({
    queryKey: studioShowKeys.detail(studioId, showId),
    queryFn: () => getStudioShow(studioId, showId),
    enabled: enabled && !!studioId && !!showId,
    initialData,
    // Navigation state should render immediately, but still be considered stale
    // so React Query revalidates from the API on mount.
    initialDataUpdatedAt: initialData ? 0 : undefined,
    staleTime: 5 * 60 * 1000,
  });
}
