import { createFileRoute } from '@tanstack/react-router';

import { MyTaskGrid } from '@/features/tasks/components/my-task-grid';
import { MyTasksPagination } from '@/features/tasks/components/my-tasks-pagination';
import { MyTasksToolbar } from '@/features/tasks/components/my-tasks-toolbar';
import { useMyTasks } from '@/features/tasks/hooks/use-my-tasks';
import { useMyTasksFilters } from '@/features/tasks/hooks/use-my-tasks-filters';

export const Route = createFileRoute('/studios/$studioId/my-tasks')({
  component: MyTasksPage,
});

function MyTasksPage() {
  const { studioId } = Route.useParams();
  const filters = useMyTasksFilters(studioId);

  const { data, isLoading, isFetching, refetch } = useMyTasks(filters.query);
  const tasks = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">
          Stay on top of your assigned tasks. Manage your daily workflow and track progress.
        </p>
      </div>

      <MyTasksToolbar
        dateFilter={filters.dateFilter}
        onDateFilterChange={filters.setDateFilter}
        searchInput={filters.searchInput}
        onSearchChange={filters.setSearch}
        selectedStatuses={filters.selectedStatuses}
        onToggleStatus={filters.toggleStatus}
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
  );
}
