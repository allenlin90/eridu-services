import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';

import { PageLayout } from '@/components/layouts/page-layout';
import { MyTaskGrid } from '@/features/tasks/components/my-task-grid';
import { MyTasksPagination } from '@/features/tasks/components/my-tasks-pagination';
import { MyTasksToolbar } from '@/features/tasks/components/my-tasks-toolbar';
import type { MyTasksSearch } from '@/features/tasks/config/my-tasks-search-schema';
import { myTasksSearchSchema } from '@/features/tasks/config/my-tasks-search-schema';
import { useMyTasks } from '@/features/tasks/hooks/use-my-tasks';
import { useMyTasksFilters } from '@/features/tasks/hooks/use-my-tasks-filters';

export const Route = createFileRoute('/studios/$studioId/my-tasks')({
  component: MyTasksPage,
  validateSearch: (search) => myTasksSearchSchema.parse(search),
});

function MyTasksPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const setUrlSearch = useCallback((updater: (prev: MyTasksSearch) => MyTasksSearch) => {
    navigate({
      search: (prev: MyTasksSearch) => updater(prev),
      replace: true,
    });
  }, [navigate]);
  const filters = useMyTasksFilters(studioId, search, setUrlSearch);

  const { data, isLoading, isFetching, refetch } = useMyTasks(filters.query);
  const tasks = data?.data ?? [];
  const meta = data?.meta;

  return (
    <PageLayout
      title="My Tasks"
      description="Stay on top of your assigned tasks. Manage your daily workflow and track progress."
    >
      <div className="space-y-4">
        <MyTasksToolbar
          showStartDate={filters.showStartDate}
          hasCustomShowStartDate={filters.hasCustomShowStartDate}
          onShowStartDateChange={filters.setShowStartDate}
          searchInput={filters.searchInput}
          onSearchChange={filters.setSearch}
          selectedStatuses={filters.selectedStatuses}
          onToggleStatus={filters.toggleStatus}
          overdueOnly={filters.overdueOnly}
          onOverdueOnlyChange={filters.setOverdueOnly}
          selectedTaskTypes={filters.selectedTaskTypes}
          onToggleTaskType={filters.toggleTaskType}
          sortBy={filters.sortBy}
          onSortChange={filters.setSort}
          limit={filters.limit}
          onLimitChange={filters.setPageSize}
          isFetching={isFetching}
          onRefresh={() => {
            void refetch();
          }}
          viewMode={filters.viewMode}
          onViewModeChange={filters.setViewMode}
          hasActiveFilters={filters.hasActiveFilters}
          activeFilterCount={filters.activeFilterCount}
          onClearFilters={filters.clearFilters}
        />

        <MyTaskGrid
          tasks={tasks}
          isLoading={isLoading}
          studioId={studioId}
          viewMode={filters.viewMode}
        />

        {meta && (
          <MyTasksPagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            isFetching={isFetching}
            onPrev={() => filters.setPage((prev) => Math.max(prev - 1, 1))}
            onNext={() => filters.setPage((prev) => Math.min(prev + 1, meta.totalPages))}
          />
        )}
      </div>
    </PageLayout>
  );
}
