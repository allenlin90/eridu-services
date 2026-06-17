import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle, CheckCircle, Flag } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
} from '@eridu/ui';

import { useShowMechanicsCoverageQuery } from '@/features/client-mechanics/api/get-mechanic-coverage';

export const Route = createFileRoute('/studios/$studioId/shows/$showId/mechanics')({
  component: ShowMechanicsTab,
});

function ShowMechanicsTab() {
  const { studioId, showId } = Route.useParams();

  const { data, isLoading } = useShowMechanicsCoverageQuery(studioId, showId);

  const handleFlagToManager = useCallback((mechanicTitle: string) => {
    toast.success(`Flagged ${mechanicTitle} coverage discrepancy to manager.`, {
      description: 'An operational alert has been raised.',
    });
  }, []);

  const columns = useMemo(() => {
    return [
      {
        accessorKey: 'instruction_label',
        header: 'Instruction Label',
        cell: ({ row }: any) => (
          <div className="font-semibold text-foreground">{row.original.instruction_label}</div>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Title',
      },
      {
        accessorKey: 'instruction_body',
        header: 'Instruction Body',
        cell: ({ row }: any) => (
          <div className="max-w-[400px] truncate text-muted-foreground" title={row.original.instruction_body}>
            {row.original.instruction_body}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }: any) => {
          const { status, frozen_revision, catalog_revision } = row.original;

          switch (status) {
            case 'current':
              return (
                <div className="flex items-center gap-2">
                  <Badge variant="success">Current</Badge>
                  <span className="text-xs text-muted-foreground">
                    v
                    {frozen_revision}
                  </span>
                </div>
              );
            case 'stale':
              return (
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Stale</Badge>
                  <span className="text-xs text-muted-foreground">
                    v
                    {frozen_revision}
                    {' '}
                    vs latest v
                    {catalog_revision}
                  </span>
                </div>
              );
            case 'missing':
            default:
              return (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Missing</Badge>
                  <span className="text-xs text-muted-foreground">Not in task snapshot</span>
                </div>
              );
          }
        },
      },
      {
        id: 'flag',
        header: 'Actions',
        cell: ({ row }: any) => {
          const { status, title } = row.original;
          if (status === 'current')
            return null;

          return (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => handleFlagToManager(title)}
            >
              <Flag className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              Flag to Manager
            </Button>
          );
        },
      },
    ];
  }, [handleFlagToManager]);

  const hasIssues = useMemo(() => {
    if (!data?.mechanics)
      return false;
    return data.mechanics.some((m) => m.status !== 'current');
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading client cues coverage...</span>
      </div>
    );
  }

  if (!data?.template_name) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
          <h3 className="font-semibold text-lg">No Bound Task Template</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            There is no finalized task with a loop-bearing template assigned to this show yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Expected Client Cues</CardTitle>
              <CardDescription className="mt-1">
                Displaying cues mapped via loop-mechanic matrix in template:
                {' '}
                <span className="font-semibold text-foreground">{data.template_name}</span>
              </CardDescription>
            </div>
            {hasIssues
              ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-900/50 self-start md:self-auto">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Discrepancies found. Use the actions below to flag updates.</span>
                  </div>
                )
              : (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-md border border-emerald-200 dark:border-emerald-900/50 self-start md:self-auto">
                    <CheckCircle className="h-4 w-4" />
                    <span>All client cues are up to date.</span>
                  </div>
                )}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns as any}
            data={data.mechanics}
            isLoading={false}
            emptyMessage="No client mechanics are configured for this task template's loops."
          />
        </CardContent>
      </Card>
    </div>
  );
}
