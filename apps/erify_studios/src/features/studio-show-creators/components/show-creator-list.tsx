import type { ColumnDef } from '@tanstack/react-table';
import { Plus, ReceiptText, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import type {
  StudioShowCreatorAssignmentItemInput,
  StudioShowCreatorListItem,
} from '@eridu/api-types/studio-creators';
import {
  Badge,
  Button,
  DataTable,
  Input,
} from '@eridu/ui';

import { useBulkAssignShowCreators } from '../api/bulk-assign-show-creators';
import {
  useShowCreatorCompensationSummary,
  useShowCreatorsQuery,
} from '../api/get-show-creators';
import { useRemoveShowCreator } from '../api/remove-show-creator';
import { getRosterAssignmentFailureMessage } from '../lib/creator-roster-guidance';

import { AddCreatorDialog } from './add-creator-dialog';
import { ShowCreatorCompensationDialog } from './show-creator-compensation-dialog';

import { useStudioAccess } from '@/lib/hooks/use-studio-access';

type ShowCreatorListProps = {
  studioId: string;
  showId: string;
  showStartTime: string;
  showEndTime: string;
};

function CreatorNameCell({ creator }: { creator: StudioShowCreatorListItem }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-sm font-medium" title={creator.creator_name}>
        {creator.creator_name}
      </span>
      <div className="flex items-center gap-2">
        <span className="truncate text-xs text-muted-foreground" title={creator.creator_alias_name}>
          {creator.creator_alias_name}
        </span>
      </div>
    </div>
  );
}

function CompensationCell({ creator }: { creator: StudioShowCreatorListItem }) {
  const hasCompensation = creator.compensation_type || creator.agreed_rate || creator.commission_rate;

  if (!hasCompensation) {
    return <span className="text-xs text-muted-foreground">Not set</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {creator.compensation_type && (
        <Badge variant="outline" className="text-[10px]">
          {creator.compensation_type}
        </Badge>
      )}
      {creator.agreed_rate && (
        <Badge variant="outline" className="text-[10px]">
          Rate:
          {' '}
          {creator.agreed_rate}
        </Badge>
      )}
      {creator.commission_rate && (
        <Badge variant="outline" className="text-[10px]">
          Commission:
          {' '}
          {creator.commission_rate}
          %
        </Badge>
      )}
    </div>
  );
}

function CreatorActionsCell({
  creator,
  onManageCompensation,
  onRemove,
  disabled,
}: {
  creator: StudioShowCreatorListItem;
  onManageCompensation?: (creator: StudioShowCreatorListItem) => void;
  onRemove: (creatorId: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onManageCompensation && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Manage compensation for ${creator.creator_name}`}
          onClick={() => onManageCompensation(creator)}
          disabled={disabled}
        >
          <ReceiptText className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove ${creator.creator_name}`}
        onClick={() => onRemove(creator.creator_id)}
        disabled={disabled}
      >
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

export function ShowCreatorList({
  studioId,
  showId,
  showStartTime,
  showEndTime,
}: ShowCreatorListProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [compensationCreator, setCompensationCreator] = useState<StudioShowCreatorListItem | null>(null);
  const [search, setSearch] = useState('');
  const { role } = useStudioAccess(studioId);
  const isAdmin = role === STUDIO_ROLE.ADMIN;
  const canManageCreatorCompensation = role === STUDIO_ROLE.ADMIN || role === STUDIO_ROLE.MANAGER;

  const {
    data: showCreators = [],
    isLoading,
    isFetching,
    refetch,
  } = useShowCreatorsQuery(studioId, showId);
  const { data: compensationSummary } = useShowCreatorCompensationSummary(
    studioId,
    showId,
    canManageCreatorCompensation,
  );

  const {
    mutate: bulkAssignCreators,
    isPending: isAssigning,
  } = useBulkAssignShowCreators(studioId, showId);
  const {
    mutate: removeCreator,
    isPending: isRemoving,
  } = useRemoveShowCreator(studioId, showId);

  const handleAddCreator = useCallback((creatorInput: StudioShowCreatorAssignmentItemInput) => {
    bulkAssignCreators(
      {
        creators: [creatorInput],
      },
      {
        onSuccess: (result) => {
          if (result.failed.length > 0) {
            const firstFailure = result.failed[0];
            const failureReason = firstFailure?.reason ?? 'Unknown error';
            toast.error(`Add failed: ${getRosterAssignmentFailureMessage(failureReason, isAdmin)}`);
            return;
          }
          if (result.skipped > 0 && result.assigned === 0) {
            toast.info('Creator is already assigned');
            setIsAddDialogOpen(false);
            return;
          }
          toast.success('Creator assigned');
          setIsAddDialogOpen(false);
        },
      },
    );
  }, [bulkAssignCreators, isAdmin]);

  const handleRemoveCreator = useCallback((creatorId: string) => {
    removeCreator(creatorId, {
      onSuccess: () => {
        toast.success('Creator removed');
      },
    });
  }, [removeCreator]);

  const creatorRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return showCreators;
    }

    return showCreators.filter((creator) => {
      return creator.creator_name.toLowerCase().includes(keyword)
        || creator.creator_alias_name.toLowerCase().includes(keyword);
    });
  }, [search, showCreators]);

  const columns = useMemo<ColumnDef<StudioShowCreatorListItem>[]>(() => [
    {
      accessorKey: 'creator_name',
      header: 'Creator',
      cell: ({ row }) => <CreatorNameCell creator={row.original} />,
    },
    {
      id: 'compensation',
      header: 'Compensation',
      cell: ({ row }) => <CompensationCell creator={row.original} />,
      meta: { className: 'hidden sm:table-cell' },
    },
    {
      accessorKey: 'note',
      header: 'Note',
      cell: ({ row }) => {
        const note = row.original.note;
        return (
          <span className="text-xs text-muted-foreground" title={note ?? undefined}>
            {note || '—'}
          </span>
        );
      },
      meta: { className: 'hidden lg:table-cell' },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <CreatorActionsCell
          creator={row.original}
          onManageCompensation={canManageCreatorCompensation ? setCompensationCreator : undefined}
          onRemove={handleRemoveCreator}
          disabled={isAssigning || isRemoving}
        />
      ),
    },
  ], [canManageCreatorCompensation, handleRemoveCreator, isAssigning, isRemoving]);

  return (
    <div className="rounded-md border bg-background p-3 sm:p-4">
      {compensationSummary && (
        <div className="mb-3 flex flex-col gap-1 rounded-md border bg-muted/30 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium">Creator compensation total</span>
          <span>
            {compensationSummary.total_amount}
            {compensationSummary.unresolved_count > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                {compensationSummary.unresolved_count}
                {' '}
                unresolved
              </span>
            )}
          </span>
        </div>
      )}
      <DataTable
        data={creatorRows}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage={search.trim() ? 'No creators match your search.' : 'No creators assigned yet.'}
        getRowId={(creator) => creator.id}
        renderToolbar={() => (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search creators..."
                className="h-9 pl-8"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => void refetch()}
                disabled={isFetching}
                aria-label="Refresh creator mappings"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
                disabled={isAssigning || isRemoving}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Creator
              </Button>
            </div>
          </div>
        )}
      />

      <AddCreatorDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        studioId={studioId}
        isAdmin={isAdmin}
        showStartTime={showStartTime}
        showEndTime={showEndTime}
        isSubmitting={isAssigning}
        onSubmit={handleAddCreator}
      />
      {canManageCreatorCompensation && (
        <ShowCreatorCompensationDialog
          open={Boolean(compensationCreator)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setCompensationCreator(null);
            }
          }}
          studioId={studioId}
          showId={showId}
          creator={compensationCreator}
        />
      )}
    </div>
  );
}
