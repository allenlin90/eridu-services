import { useCallback } from 'react';

import { Card } from '@eridu/ui';

import type { SceneQcDailySearch } from '../config/scene-qc-daily-search-schema';
import { useSceneQcConfirmation } from '../hooks/use-scene-qc-confirmation';
import { useSceneQcDaily } from '../hooks/use-scene-qc-daily';
import { useSceneQcReviewForm } from '../hooks/use-scene-qc-review-form';

import { SCENE_QC_CONFIRMATION_ACTION_ID } from './scene-qc-confirmation-card';
import { SceneQcDailyToolbar } from './scene-qc-daily-toolbar';
import { SceneQcFilterFields } from './scene-qc-filter-fields';
import { SceneQcMobileDrawer } from './scene-qc-mobile-drawer';
import { SceneQcReviewPanel } from './scene-qc-review-panel';
import { SceneQcShowQueue } from './scene-qc-show-queue';
import { SceneQcSummaryCards } from './scene-qc-summary-cards';

type SceneQcDailyWorkspaceProps = {
  studioId: string;
  search: SceneQcDailySearch;
  onSearchChange: (next: Partial<SceneQcDailySearch>) => void;
  onOpenReport: (confirmationId: string) => void;
};

/** Container: composes only. Queries live in useSceneQcDaily; presentation config lives in the child components. */
export function SceneQcDailyWorkspace({ studioId, search, onSearchChange, onOpenReport }: SceneQcDailyWorkspaceProps) {
  const controller = useSceneQcDaily({ studioId, search, onSearchChange });
  const { summaryQuery, itemsQuery, detailQuery } = controller;

  const confirmation = useSceneQcConfirmation({
    studioId,
    operationalDate: controller.effectiveDate,
    summary: summaryQuery.data,
  });

  const form = useSceneQcReviewForm({
    studioId,
    showId: controller.selectedShowId,
    operationalDate: controller.effectiveDate,
    detail: detailQuery.data,
    refetchDetail: detailQuery.refetch,
  });

  const handleSave = useCallback(async () => {
    const saved = await form.save();
    if (saved) {
      const movedToNext = controller.saveAndNext();
      // If no unreviewed Show remains, focus moves to the confirmation
      // region's action (§7.2 step 8, §7.8).
      if (!movedToNext) {
        document.getElementById(SCENE_QC_CONFIRMATION_ACTION_ID)?.focus();
      }
    }
  }, [controller, form]);

  const filtersActive = Boolean(search.client_id || search.platform_id || search.search || search.review_state !== 'all');
  const items = itemsQuery.data?.data ?? [];
  const totalPages = itemsQuery.data?.meta.totalPages ?? 0;
  const dayIsEmpty = !summaryQuery.isLoading && summaryQuery.data?.eligible_count === 0;

  return (
    <div className="min-w-0 space-y-4">
      <SceneQcDailyToolbar
        date={controller.effectiveDate}
        isCurrentDay={controller.isCurrentDay}
        isRefreshing={summaryQuery.isFetching || itemsQuery.isFetching}
        onPreviousDay={controller.goToPreviousDay}
        onNextDay={controller.goToNextDay}
        onToday={controller.goToToday}
        onRefresh={() => {
          void summaryQuery.refetch();
          void itemsQuery.refetch();
        }}
      />

      <SceneQcSummaryCards
        summary={summaryQuery.data}
        isLoading={summaryQuery.isLoading}
        confirmation={confirmation}
        onOpenReport={onOpenReport}
      />

      {dayIsEmpty
        ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center">
              <p className="font-medium">No Shows scheduled for this operational day</p>
              <p className="text-sm text-muted-foreground">There is nothing to review yet.</p>
            </div>
          )
        : (
            <>
              <SceneQcFilterFields
                studioId={studioId}
                clientId={search.client_id}
                platformId={search.platform_id}
                reviewState={search.review_state}
                search={search.search}
                onClientChange={(value) => controller.changeScope({ client_id: value })}
                onPlatformChange={(value) => controller.changeScope({ platform_id: value })}
                onReviewStateChange={(value) => controller.changeScope({ review_state: value })}
                onSearchChange={(value) => controller.changeScope({ search: value })}
              />

              <div className="grid min-w-0 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
                <Card className="flex min-h-[28rem] min-w-0 flex-col overflow-hidden lg:h-[calc(100dvh-20rem)]">
                  <SceneQcShowQueue
                    items={items}
                    selectedShowId={controller.selectedShowId}
                    page={search.page}
                    totalPages={totalPages}
                    isLoading={itemsQuery.isLoading}
                    isError={itemsQuery.isError}
                    filtersActive={filtersActive}
                    onSelect={controller.selectShow}
                    onPageChange={controller.changePage}
                  />
                </Card>

                <Card className="hidden min-w-0 overflow-y-auto lg:block lg:h-[calc(100dvh-20rem)]">
                  <SceneQcReviewPanel
                    detail={detailQuery.data}
                    isLoading={detailQuery.isLoading}
                    isError={detailQuery.isError}
                    form={form}
                    onSave={() => void handleSave()}
                  />
                </Card>
              </div>

              {controller.isMobile
                ? (
                    <SceneQcMobileDrawer
                      open={Boolean(controller.selectedShowId)}
                      detail={detailQuery.data}
                      isLoading={detailQuery.isLoading}
                      isError={detailQuery.isError}
                      form={form}
                      onSave={() => void handleSave()}
                      onOpenChange={(open) => {
                        if (!open) {
                          controller.closeMobileDetail();
                        }
                      }}
                    />
                  )
                : null}
            </>
          )}
    </div>
  );
}
