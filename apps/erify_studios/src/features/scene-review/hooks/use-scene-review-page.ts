import { useEffect, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

import { useIsMobile } from '@eridu/ui/hooks/use-is-mobile';

import {
  useSceneReviewDetailQuery,
  useSceneReviewListQuery,
} from '@/features/scene-review/api/get-scene-review';
import type { SceneReviewSearch } from '@/features/scene-review/config/scene-review-search-schema';
import {
  buildOperationalDayRange,
  buildOperationalDayRangeFromPickerDates,
  operationalDayRangeToPickerDates,
} from '@/lib/operational-day-range';

type UseSceneReviewPageParams = {
  studioId: string;
  search: SceneReviewSearch;
  onSearchChange: (next: Partial<SceneReviewSearch>) => void;
};

export function useSceneReviewPage({
  studioId,
  search,
  onSearchChange,
}: UseSceneReviewPageParams) {
  const isMobile = useIsMobile();
  const operationalRange = useMemo(
    () => buildOperationalDayRange({
      date_from: search.date_from,
      date_to: search.date_to,
    }),
    [search.date_from, search.date_to],
  );
  const listParams = useMemo(() => ({
    mode: search.mode,
    show_start_from: operationalRange.windowStart.toISOString(),
    show_start_to: operationalRange.windowEnd.toISOString(),
    client_id: search.client_id,
    platform_id: search.platform_id,
    search: search.search,
    page: search.page,
    limit: search.limit,
  }), [operationalRange, search]);
  const listQuery = useSceneReviewListQuery(studioId, listParams);
  const detailQuery = useSceneReviewDetailQuery(studioId, search.task_id);

  useEffect(() => {
    if (!isMobile && !search.task_id && listQuery.data?.data[0]) {
      onSearchChange({ task_id: listQuery.data.data[0].task_id });
    }
  }, [isMobile, listQuery.data?.data, onSearchChange, search.task_id]);

  const changeScope = (next: Partial<SceneReviewSearch>) => {
    onSearchChange({ ...next, page: 1, task_id: undefined });
  };
  const handleDateRangeChange = (range: DateRange | undefined) => {
    const next = buildOperationalDayRangeFromPickerDates(range?.from, range?.to);
    changeScope({ date_from: next.dateFrom, date_to: next.dateTo });
  };
  const refresh = async () => {
    await Promise.all([
      listQuery.refetch(),
      search.task_id ? detailQuery.refetch() : Promise.resolve(),
    ]);
  };

  return {
    isMobile,
    listQuery,
    detailQuery,
    selectedTaskId: search.task_id,
    selectedItem: listQuery.data?.data.find((item) => item.task_id === search.task_id),
    dateRange: operationalDayRangeToPickerDates(operationalRange),
    selectTask: (taskId: string) => onSearchChange({ task_id: taskId }),
    closeMobileDetail: () => onSearchChange({ task_id: undefined }),
    changeMode: (mode: SceneReviewSearch['mode']) => changeScope({ mode }),
    changeClient: (clientId?: string) => changeScope({ client_id: clientId }),
    changePlatform: (platformId?: string) => changeScope({ platform_id: platformId }),
    changeTextSearch: (value?: string) => changeScope({ search: value }),
    changePage: (page: number) => onSearchChange({ page, task_id: undefined }),
    handleDateRangeChange,
    refresh,
  };
}
