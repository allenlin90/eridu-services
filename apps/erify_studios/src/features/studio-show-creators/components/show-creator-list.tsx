import type { ColumnDef } from '@tanstack/react-table';
import { Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { StudioShowCreatorListItem } from '@eridu/api-types/studio-creators';
import {
  Badge,
  Button,
  DataTable,
  Input,
} from '@eridu/ui';

import { useBulkAssignShowCreators } from '../api/bulk-assign-show-creators';
import { useShowCreatorsQuery } from '../api/get-show-creators';
import { useRemoveShowCreator } from '../api/remove-show-creator';

import { AddCreatorDialog } from './add-creator-dialog';

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

function RemoveActionCell({
  creator,
  onRemove,
  disabled,
}: {
  creator: StudioShowCreatorListItem;
  onRemove: (creatorId: string) => void;
  disabled: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Remove ${creator.creator_name}`}
      onClick={() => onRemove(creator.creator_id)}
      disabled={disabled}
    >
      <Trash2 className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}

export function ShowCreatorList({
  studioId,
  showId,
  showStartTime,
  showEndTime,
}: ShowCreatorListProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  const {
    data: showCreators = [],
    isLoading,
    isFetching,
    refetch,
  } = useShowCreatorsQuery(studioId, showId);

  const {
    mutate: bulkAssignCreators,
    isPending: isAssigning,
  } = useBulkAssignShowCreators(studioId, showId);
  const {
    mutate: removeCreator,
    isPending: isRemoving,
  } = useRemoveShowCreator(studioId, showId);

  const handleAddCreator = useCallback((creatorId: string) => {
    bulkAssignCreators(
      {
        creators: [{ creator_id: creatorId }],
      },
      {
        onSuccess: (result) => {
          if (result.failed.length > 0) {
            toast.error(`Add failed: ${result.failed[0]?.reason ?? 'Unknown error'}`);
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
  }, [bulkAssignCreators]);

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
        <RemoveActionCell
          creator={row.original}
          onRemove={handleRemoveCreator}
          disabled={isAssigning || isRemoving}
        />
      ),
    },
  ], [handleRemoveCreator, isAssigning, isRemoving]);

  return (
    <div className="rounded-md border bg-background p-3 sm:p-4">
      <DataTable
        data={creatorRows}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage={search.trim() ? 'No creators match your search.' : 'No creators assigned yet.'}
        getRowId={(creator) => creator.creator_id}
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
        showStartTime={showStartTime}
        showEndTime={showEndTime}
        isSubmitting={isAssigning}
        onSubmit={handleAddCreator}
      />
    </div>
  );
}
