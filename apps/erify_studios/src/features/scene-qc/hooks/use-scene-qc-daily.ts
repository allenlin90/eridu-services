import { useCallback, useEffect, useMemo } from 'react';

import { useIsMobile } from '@eridu/ui/hooks/use-is-mobile';

import { useSceneQcItemDetailQuery } from '../api/get-scene-qc-item-detail';
import type { SceneQcItemsParams } from '../api/get-scene-qc-items';
import { useSceneQcItemsQuery } from '../api/get-scene-qc-items';
import { useSceneQcSummaryQuery } from '../api/get-scene-qc-summary';
import type { SceneQcDailySearch } from '../config/scene-qc-daily-search-schema';
import { getCurrentOperationalDate, shiftOperationalDate } from '../lib/scene-qc-operational-date';

type UseSceneQcDailyParams = {
  studioId: string;
  search: SceneQcDailySearch;
  onSearchChange: (next: Partial<SceneQcDailySearch>) => void;
};

/**
 * View-model for the Daily Review workspace: resolves the effective
 * operational date, builds list params, runs the three queries, and owns
 * navigation/selection. See SCENE_QC_CHILD_PR_3_BREAKDOWN.md section 3.3.
 */
export function useSceneQcDaily({ studioId, search, onSearchChange }: UseSceneQcDailyParams) {
  const isMobile = useIsMobile();
  const effectiveDate = search.date ?? getCurrentOperationalDate();
  const isCurrentDay = effectiveDate === getCurrentOperationalDate();

  // `date` left undefined in the URL means "current operational day" -- write
  // the resolved value in on first navigation so back/forward is stable.
  useEffect(() => {
    if (!search.date) {
      onSearchChange({ date: effectiveDate });
    }
    // Only re-runs when the URL's date field itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.date]);

  const summaryQuery = useSceneQcSummaryQuery(studioId, effectiveDate, { isCurrentDay });

  const itemsParams: SceneQcItemsParams = useMemo(() => ({
    operational_date: effectiveDate,
    client_id: search.client_id,
    platform_id: search.platform_id,
    review_state: search.review_state,
    search: search.search,
    page: search.page,
    limit: search.limit,
  }), [effectiveDate, search.client_id, search.platform_id, search.review_state, search.search, search.page, search.limit]);
  const itemsQuery = useSceneQcItemsQuery(studioId, itemsParams, { isCurrentDay });

  const detailQuery = useSceneQcItemDetailQuery(studioId, effectiveDate, search.show_id);

  // Desktop auto-selects the first queue row when show_id is absent; mobile
  // starts with the list and requires an explicit tap (mirrors the shipped
  // use-scene-review-page.ts guard).
  useEffect(() => {
    if (!isMobile && !search.show_id && itemsQuery.data?.data[0]) {
      onSearchChange({ show_id: itemsQuery.data.data[0].show_id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, itemsQuery.data?.data, search.show_id]);

  const changeScope = useCallback((next: Partial<SceneQcDailySearch>) => {
    onSearchChange({ ...next, page: 1, show_id: undefined });
  }, [onSearchChange]);

  const changePage = useCallback((page: number) => {
    onSearchChange({ page, show_id: undefined });
  }, [onSearchChange]);

  const selectShow = useCallback((showId: string) => {
    onSearchChange({ show_id: showId });
  }, [onSearchChange]);

  const closeMobileDetail = useCallback(() => {
    onSearchChange({ show_id: undefined });
  }, [onSearchChange]);

  const goToDate = useCallback((date: string) => changeScope({ date }), [changeScope]);
  const goToPreviousDay = useCallback(
    () => goToDate(shiftOperationalDate(effectiveDate, -1)),
    [effectiveDate, goToDate],
  );
  const goToNextDay = useCallback(
    () => goToDate(shiftOperationalDate(effectiveDate, 1)),
    [effectiveDate, goToDate],
  );
  const goToToday = useCallback(() => goToDate(getCurrentOperationalDate()), [goToDate]);

  /**
   * Picks the next `unreviewed` Show from the current page (after the
   * selected row, wrapping to the start of the page if none remain after
   * it). Returns `true` when a Show was selected, `false` when none remain
   * -- the caller focuses the confirmation region in that case (Child PR 4).
   */
  const saveAndNext = useCallback((): boolean => {
    const items = itemsQuery.data?.data ?? [];
    const currentIndex = items.findIndex((item) => item.show_id === search.show_id);
    const isUnreviewed = (item: (typeof items)[number]) => !item.is_blocked && item.result === null;
    const next = items.slice(currentIndex + 1).find(isUnreviewed) ?? items.find(isUnreviewed);
    if (next) {
      onSearchChange({ show_id: next.show_id });
      return true;
    }
    return false;
  }, [itemsQuery.data?.data, onSearchChange, search.show_id]);

  return {
    isMobile,
    effectiveDate,
    isCurrentDay,
    summaryQuery,
    itemsQuery,
    detailQuery,
    selectedShowId: search.show_id,
    selectShow,
    closeMobileDetail,
    changeScope,
    changePage,
    goToDate,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    saveAndNext,
  };
}
