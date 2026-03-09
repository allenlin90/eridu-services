import { useAddShowMc } from '../api/add-show-mc';
import { useShowMcsQuery } from '../api/get-show-mcs';
import { useRemoveShowMc } from '../api/remove-show-mc';

export function useShowMcs(studioId: string, showId: string) {
  const { data, isLoading, isFetching, refetch } = useShowMcsQuery(studioId, showId);

  const addMutation = useAddShowMc(studioId, showId);
  const removeMutation = useRemoveShowMc(studioId, showId);

  return {
    data,
    isLoading,
    isFetching,
    refetch,
    addMutation,
    removeMutation,
  };
}
