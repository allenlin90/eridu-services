import { useAddShowCreator } from '../api/add-show-creator';
import { useShowCreatorsQuery } from '../api/get-show-creators';
import { useRemoveShowCreator } from '../api/remove-show-creator';

export function useShowCreators(studioId: string, showId: string) {
  const { data, isLoading, isFetching, refetch } = useShowCreatorsQuery(studioId, showId);

  const addMutation = useAddShowCreator(studioId, showId);
  const removeMutation = useRemoveShowCreator(studioId, showId);

  return {
    data,
    isLoading,
    isFetching,
    refetch,
    addMutation,
    removeMutation,
  };
}
