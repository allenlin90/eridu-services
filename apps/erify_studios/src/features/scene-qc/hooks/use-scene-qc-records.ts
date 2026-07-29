import { useCallback, useEffect, useMemo } from 'react';

import { useIsMobile } from '@eridu/ui/hooks/use-is-mobile';

import { useSceneQcRecordDetailQuery } from '../api/get-scene-qc-record-detail';
import type { SceneQcRecordsParams } from '../api/get-scene-qc-records';
import { useSceneQcRecordsQuery } from '../api/get-scene-qc-records';
import type { SceneQcSearch } from '../config/scene-qc-search-schema';
import { getCurrentOperationalDate, shiftOperationalDate } from '../lib/scene-qc-operational-date';

const RECORDS_DEFAULT_RANGE_DAYS = 7;

type UseSceneQcRecordsParams = {
  studioId: string;
  search: SceneQcSearch;
  onSearchChange: (next: Partial<SceneQcSearch>) => void;
};

/**
 * View-model for the Records tab: resolves the effective date range, builds
 * list params, runs the list + detail queries, and owns selection/paging.
 * See SCENE_QC_CHILD_PR_4_BREAKDOWN.md section 3.5.
 */
export function useSceneQcRecords({ studioId, search, onSearchChange }: UseSceneQcRecordsParams) {
  const isMobile = useIsMobile();

  // `date_from`/`date_to` left undefined mean "last 7 operational days ending
  // today" -- resolved here and written into the URL on first navigation,
  // exactly as the daily tab does with `date`.
  const dateTo = search.date_to ?? getCurrentOperationalDate();
  const dateFrom = search.date_from ?? shiftOperationalDate(dateTo, -(RECORDS_DEFAULT_RANGE_DAYS - 1));

  useEffect(() => {
    if (!search.date_from || !search.date_to) {
      onSearchChange({ date_from: dateFrom, date_to: dateTo });
    }
    // Only re-runs when the URL's date range fields themselves change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.date_from, search.date_to]);

  const listParams: SceneQcRecordsParams = useMemo(() => ({
    date_from: dateFrom,
    date_to: dateTo,
    client_id: search.client_id,
    platform_id: search.platform_id,
    result: search.result,
    page: search.page,
    limit: search.limit,
  }), [dateFrom, dateTo, search.client_id, search.platform_id, search.result, search.page, search.limit]);

  const recordsQuery = useSceneQcRecordsQuery(studioId, listParams);
  const detailQuery = useSceneQcRecordDetailQuery(studioId, search.record_id);

  const changeScope = useCallback((next: Partial<SceneQcSearch>) => {
    onSearchChange({ ...next, page: 1, record_id: undefined });
  }, [onSearchChange]);

  const changePage = useCallback((page: number) => {
    onSearchChange({ page, record_id: undefined });
  }, [onSearchChange]);

  const selectRecord = useCallback((reviewId: string) => {
    onSearchChange({ record_id: reviewId });
  }, [onSearchChange]);

  const closeDetail = useCallback(() => {
    onSearchChange({ record_id: undefined });
  }, [onSearchChange]);

  return {
    isMobile,
    dateFrom,
    dateTo,
    recordsQuery,
    detailQuery,
    selectedRecordId: search.record_id,
    selectRecord,
    closeDetail,
    changeScope,
    changePage,
  };
}
