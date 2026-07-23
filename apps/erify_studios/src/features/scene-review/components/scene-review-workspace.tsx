import { Card } from '@eridu/ui';

import { SceneReviewDetail } from './scene-review-detail';
import { SceneReviewMobileDrawer } from './scene-review-mobile-drawer';
import { SceneReviewQueue } from './scene-review-queue';
import { SceneReviewToolbar } from './scene-review-toolbar';

import type { SceneReviewSearch } from '@/features/scene-review/config/scene-review-search-schema';
import type { useSceneReviewPage } from '@/features/scene-review/hooks/use-scene-review-page';

type SceneReviewPageController = ReturnType<typeof useSceneReviewPage>;

type SceneReviewWorkspaceProps = {
  studioId: string;
  search: SceneReviewSearch;
  controller: SceneReviewPageController;
};

export function SceneReviewWorkspace({
  studioId,
  search,
  controller,
}: SceneReviewWorkspaceProps) {
  const { listQuery, detailQuery } = controller;
  const totalPages = listQuery.data?.meta.totalPages ?? 0;

  return (
    <div className="min-w-0 space-y-4">
      <SceneReviewToolbar
        studioId={studioId}
        mode={search.mode}
        dateRange={controller.dateRange}
        clientId={search.client_id}
        platformId={search.platform_id}
        search={search.search}
        isRefreshing={listQuery.isFetching || detailQuery.isFetching}
        onModeChange={controller.changeMode}
        onDateRangeChange={controller.handleDateRangeChange}
        onClientChange={controller.changeClient}
        onPlatformChange={controller.changePlatform}
        onSearchChange={controller.changeTextSearch}
        onRefresh={() => void controller.refresh()}
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="flex min-h-[28rem] min-w-0 flex-col overflow-hidden lg:h-[calc(100dvh-15rem)]">
          <SceneReviewQueue
            items={listQuery.data?.data ?? []}
            mode={search.mode}
            selectedTaskId={controller.selectedTaskId}
            page={search.page}
            totalPages={totalPages}
            isLoading={listQuery.isLoading}
            isError={listQuery.isError}
            onSelect={controller.selectTask}
            onPageChange={controller.changePage}
          />
        </Card>

        <Card className="hidden min-w-0 overflow-y-auto lg:block lg:h-[calc(100dvh-15rem)]">
          <SceneReviewDetail
            detail={detailQuery.data}
            isLoading={detailQuery.isLoading}
            isError={detailQuery.isError}
          />
        </Card>
      </div>

      {controller.isMobile
        ? (
            <SceneReviewMobileDrawer
              open={Boolean(controller.selectedTaskId)}
              detail={detailQuery.data}
              isLoading={detailQuery.isLoading}
              isError={detailQuery.isError}
              onOpenChange={(open) => {
                if (!open) {
                  controller.closeMobileDetail();
                }
              }}
            />
          )
        : null}
    </div>
  );
}
