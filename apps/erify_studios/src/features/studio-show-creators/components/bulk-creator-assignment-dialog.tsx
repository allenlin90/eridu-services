import { useMemo, useState } from 'react';

import {
  BULK_ASSIGN_MAX_CREATORS_PER_SHOW,
  BULK_ASSIGN_MAX_SHOWS,
  STUDIO_CREATOR_ROSTER_STATE,
} from '@eridu/api-types/studio-creators';
import {
  AsyncMultiCombobox,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@eridu/ui';

import { useBulkAssignCreatorsToShows } from '../api/bulk-assign-creators-to-shows';
import { useCreatorCatalogQuery } from '../api/get-creator-catalog';

import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';

type BulkCreatorAssignmentDialogProps = {
  studioId: string;
  shows: StudioShow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function BulkCreatorAssignmentDialog({
  studioId,
  shows,
  open,
  onOpenChange,
  onSuccess,
}: BulkCreatorAssignmentDialogProps) {
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
  const [creatorSearch, setCreatorSearch] = useState('');

  const { data: creators = [], isLoading: isLoadingCreators } = useCreatorCatalogQuery(
    studioId,
    {
      search: creatorSearch.trim().length > 0 ? creatorSearch : undefined,
      include_rostered: true,
      limit: 50,
    },
    open,
  );

  const creatorOptions = useMemo(
    () =>
      creators
        .filter((creator) => creator.roster_state !== STUDIO_CREATOR_ROSTER_STATE.INACTIVE)
        .map((creator) => ({
          value: creator.id,
          label: creator.alias_name
            ? `${creator.name} (${creator.alias_name})`
            : creator.name,
        })),
    [creators],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedCreatorIds([]);
      setCreatorSearch('');
    }
    onOpenChange(nextOpen);
  };

  const { mutate: assignCreators, isPending: isAssigning } = useBulkAssignCreatorsToShows({
    studioId,
    onSuccess: () => {
      handleOpenChange(false);
      onSuccess?.();
    },
  });

  const creatorLimitExceeded = selectedCreatorIds.length > BULK_ASSIGN_MAX_CREATORS_PER_SHOW;
  const showLimitExceeded = shows.length > BULK_ASSIGN_MAX_SHOWS;

  const handleAssign = () => {
    if (selectedCreatorIds.length === 0 || shows.length === 0 || creatorLimitExceeded || showLimitExceeded) {
      return;
    }

    assignCreators({
      show_ids: shows.map((show) => show.id),
      creator_ids: selectedCreatorIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Assign Creators to
            {' '}
            {shows.length}
            {' '}
            Show(s)
          </DialogTitle>
          <DialogDescription>
            Select creators to assign across all selected shows.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex flex-col gap-4">
          <div className="max-h-32 overflow-y-auto rounded-md border bg-slate-50 p-2 text-sm">
            <p className="mb-2 px-1 font-medium text-slate-500">Selected Shows</p>
            <div className="flex flex-col gap-1">
              {shows.map((show) => (
                <div key={show.id} className="truncate px-1 text-sm" title={show.name}>
                  •
                  {' '}
                  {show.name}
                </div>
              ))}
            </div>
            {showLimitExceeded && (
              <p className="mt-2 px-1 text-xs text-destructive">
                Too many shows selected. Maximum is
                {' '}
                {BULK_ASSIGN_MAX_SHOWS}
                .
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Creators</p>
            <AsyncMultiCombobox
              value={selectedCreatorIds}
              onChange={setSelectedCreatorIds}
              onSearch={setCreatorSearch}
              options={creatorOptions}
              isLoading={isLoadingCreators}
              placeholder="Search creators..."
              emptyMessage="No creators found."
              disabled={isAssigning}
            />
            <p className={`text-xs ${creatorLimitExceeded ? 'text-destructive' : 'text-muted-foreground'}`}>
              Selected:
              {' '}
              {selectedCreatorIds.length}
              {' '}
              /
              {' '}
              {BULK_ASSIGN_MAX_CREATORS_PER_SHOW}
              {' '}
              creator(s)
              {creatorLimitExceeded && ' — limit exceeded'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isAssigning}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isAssigning || selectedCreatorIds.length === 0 || creatorLimitExceeded || showLimitExceeded}>
            {isAssigning ? 'Assigning...' : 'Assign Creators'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
