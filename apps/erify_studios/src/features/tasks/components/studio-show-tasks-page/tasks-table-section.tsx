import type { RowSelectionState, Updater } from '@tanstack/react-table';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';

import { DataTable, DataTableToolbar } from '@/components/data-table';
import type { getColumns } from '@/features/studio-shows/components/show-tasks-table/columns';

type TasksTableSectionProps = {
  data: TaskWithRelationsDto[];
  columns: ReturnType<typeof getColumns>;
  isLoading: boolean;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (updater: Updater<RowSelectionState>) => void;
  renderToolbarActions: () => React.ReactNode;
};

export function TasksTableSection({
  data,
  columns,
  isLoading,
  rowSelection,
  onRowSelectionChange,
  renderToolbarActions,
}: TasksTableSectionProps) {
  return (
    <div className="flex-1 mt-4">
      <DataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No tasks generated for this show yet."
        rowSelection={rowSelection}
        onRowSelectionChange={onRowSelectionChange}
        getRowId={(task) => task.id}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchColumn="description"
            searchableColumns={[{ id: 'description', title: 'Task Description' }]}
            searchPlaceholder="Search tasks..."
          >
            {renderToolbarActions()}
          </DataTableToolbar>
        )}
      />
    </div>
  );
}
