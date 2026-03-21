import { format } from 'date-fns';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { TaskReportDefinition } from '@eridu/api-types/task-management';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@eridu/ui';

import { useDeleteTaskReportDefinition } from '../hooks/use-delete-task-report-definition';
import { useTaskReportDefinitions } from '../hooks/use-task-report-definitions';

import { DeleteConfirmDialog } from '@/features/admin/components';

type TaskReportDefinitionsViewerProps = {
  studioId: string;
  page: number;
  limit: number;
  search: string | undefined;
  onSearchChange: (value: string | undefined) => void;
  onPageChange: (page: number) => void;
  onCreateNew: () => void;
  onOpenBuilder: (definitionId: string) => void;
};

export function TaskReportDefinitionsViewer({
  studioId,
  page,
  limit,
  search,
  onSearchChange,
  onPageChange,
  onCreateNew,
  onOpenBuilder,
}: TaskReportDefinitionsViewerProps) {
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const { data, isLoading, isFetching, isError, refetch } = useTaskReportDefinitions({
    studioId,
    query: { page, limit, search },
  });
  const deleteMutation = useDeleteTaskReportDefinition({ studioId });

  const definitions = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;
  const pageTitle = useMemo(() => {
    if (total === 0) {
      return 'No saved definitions';
    }
    return `${total} saved definition${total === 1 ? '' : 's'}`;
  }, [total]);

  const formatScopeSummary = (definition: TaskReportDefinition) => {
    const summary = [];
    const { scope, columns } = definition.definition;

    if (scope.date_from && scope.date_to) {
      summary.push(`${format(new Date(`${scope.date_from}T00:00:00`), 'PP')} - ${format(new Date(`${scope.date_to}T00:00:00`), 'PP')}`);
    }
    if (scope.client_id?.length) {
      summary.push(`${scope.client_id.length} client filter${scope.client_id.length === 1 ? '' : 's'}`);
    }
    if (scope.source_templates?.length) {
      summary.push(`${scope.source_templates.length} template${scope.source_templates.length === 1 ? '' : 's'}`);
    }
    summary.push(`${columns.length} column${columns.length === 1 ? '' : 's'}`);

    return summary;
  };

  const handleDelete = async (definitionId: string, definitionName: string) => {
    try {
      await deleteMutation.mutateAsync(definitionId);
      setPendingDelete(null);
      toast.success('Report definition deleted');
    } catch (error) {
      console.error(error);
      toast.error(`Failed to delete "${definitionName}"`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-2">
          <Input
            value={search ?? ''}
            onChange={(event) => onSearchChange(event.target.value.trim() || undefined)}
            placeholder="Search definition name..."
            className="max-w-md"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Refresh task report definitions"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Button onClick={onCreateNew}>
          Build New Report
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>
            Open a saved definition to run or adjust it in the dedicated builder route.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading report definitions...</p>}
          {isError && <p className="text-sm text-destructive">Failed to load report definitions.</p>}
          {!isLoading && !isError && definitions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No definitions yet. Build a report and save your preferred scope/columns.
            </p>
          )}

          {!isLoading && !isError && definitions.map((definition) => (
            <div
              key={definition.id}
              className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium">{definition.name}</p>
                {definition.description && (
                  <p className="text-sm text-muted-foreground">{definition.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {formatScopeSummary(definition).map((item) => (
                    <span key={item} className="rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                      {item}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Updated
                  {' '}
                  {new Date(definition.updated_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onOpenBuilder(definition.id)}
                >
                  Open & Run
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => setPendingDelete({ id: definition.id, name: definition.name })}
                  disabled={deleteMutation.isPending}
                  aria-label={`Delete report definition ${definition.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1 || isFetching}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page
          {' '}
          {page}
          {' '}
          of
          {' '}
          {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isFetching}
        >
          Next
        </Button>
      </div>

      <DeleteConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        title={pendingDelete ? `Delete "${pendingDelete.name}"?` : 'Delete report definition?'}
        description="This saved definition will be removed from the Task Reports landing page. Existing generated exports are not affected."
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (!pendingDelete) {
            return;
          }
          void handleDelete(pendingDelete.id, pendingDelete.name);
        }}
      />
    </div>
  );
}
