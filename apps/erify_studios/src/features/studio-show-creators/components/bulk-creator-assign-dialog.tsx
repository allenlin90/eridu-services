import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { CreatorApiResponse } from '@eridu/api-types/creators';
import {
  AsyncMultiCombobox,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import { type BulkAssignMode, useBulkAssignCreators } from '../api/bulk-assign-creators';
import { type AvailabilityWindow, getCreatorAvailability } from '../api/get-creator-availability';

import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';

type BulkCreatorAssignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  selectedShows: StudioShow[];
  onSuccess: () => void;
  defaultMode?: BulkAssignMode;
};

export function BulkCreatorAssignDialog({
  open,
  onOpenChange,
  studioId,
  selectedShows,
  onSuccess,
  defaultMode = 'append',
}: BulkCreatorAssignDialogProps) {
  const [mode, setMode] = useState<BulkAssignMode>(defaultMode);
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { mutate: bulkAssign, isPending } = useBulkAssignCreators(studioId);

  const selectedShowsCount = selectedShows.length;
  const selectedShowIds = useMemo(() => selectedShows.map((show) => show.id), [selectedShows]);
  const selectedShowIdSet = useMemo(() => new Set(selectedShowIds), [selectedShowIds]);
  const availabilityWindows = useMemo<AvailabilityWindow[]>(() => {
    return selectedShows
      .filter((s) => s.start_time && s.end_time)
      .map((s) => ({ dateFrom: s.start_time, dateTo: s.end_time }));
  }, [selectedShows]);

  function normalizeSearchText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  const contextQuery = useQuery({
    queryKey: ['bulk-creator-context', studioId, availabilityWindows, selectedShowIds],
    enabled: open && availabilityWindows.length > 0 && selectedShows.length > 0,
    queryFn: async () => {
      const creators = await getCreatorAvailability(studioId, availabilityWindows);
      const coverageMap = new Map<string, Set<string>>();
      const labelMap = new Map<string, string>();
      selectedShows.forEach((show) => {
        show.mcs.forEach((assignment) => {
          if (!assignment.creator_id) {
            return;
          }
          const existingCoverage = coverageMap.get(assignment.creator_id) ?? new Set<string>();
          existingCoverage.add(show.id);
          coverageMap.set(assignment.creator_id, existingCoverage);
          if (!labelMap.has(assignment.creator_id)) {
            const label = assignment.creator_aliasname
              ? `${assignment.creator_name ?? assignment.creator_id} (${assignment.creator_aliasname})`
              : (assignment.creator_name ?? assignment.creator_id);
            labelMap.set(assignment.creator_id, label);
          }
        });
      });
      return {
        creators,
        assignmentCoverageByCreatorId: Object.fromEntries(
          Array.from(coverageMap.entries()).map(([creatorId, showIds]) => [creatorId, Array.from(showIds)]),
        ),
        assignmentLabelByCreatorId: Object.fromEntries(labelMap.entries()),
      };
    },
  });
  const availableCreators: CreatorApiResponse[] = useMemo(
    () => contextQuery.data?.creators ?? [],
    [contextQuery.data?.creators],
  );
  const assignmentCoverageByCreatorId: Record<string, string[]> = useMemo(
    () => contextQuery.data?.assignmentCoverageByCreatorId ?? {},
    [contextQuery.data?.assignmentCoverageByCreatorId],
  );
  const assignmentLabelByCreatorId: Record<string, string> = useMemo(
    () => contextQuery.data?.assignmentLabelByCreatorId ?? {},
    [contextQuery.data?.assignmentLabelByCreatorId],
  );
  const isLoadingContext = contextQuery.isLoading || contextQuery.isFetching;

  const selectedCreatorIdSet = useMemo(() => new Set(selectedCreatorIds), [selectedCreatorIds]);
  const searchTermNormalized = useMemo(() => normalizeSearchText(searchTerm.trim()), [searchTerm]);
  const availableLabelByCreatorId = useMemo(
    () =>
      Object.fromEntries(
        availableCreators.map((creator) => [
          creator.id,
          creator.alias_name ? `${creator.name} (${creator.alias_name})` : creator.name,
        ]),
      ),
    [availableCreators],
  );
  const visibleCreators = useMemo(() => {
    const matchesSearch = (creator: CreatorApiResponse) => {
      if (!searchTermNormalized) {
        return true;
      }
      const composite = `${creator.name} ${creator.alias_name ?? ''}`;
      return normalizeSearchText(composite).includes(searchTermNormalized);
    };
    const filtered = availableCreators.filter(matchesSearch);
    const sorted = [...filtered].sort((left, right) => {
      const leftSelected = selectedCreatorIdSet.has(left.id) ? 1 : 0;
      const rightSelected = selectedCreatorIdSet.has(right.id) ? 1 : 0;
      if (leftSelected !== rightSelected) {
        return rightSelected - leftSelected;
      }
      if (!searchTermNormalized) {
        const leftAssignedCount = (assignmentCoverageByCreatorId[left.id] ?? []).filter((showId) => selectedShowIdSet.has(showId)).length;
        const rightAssignedCount = (assignmentCoverageByCreatorId[right.id] ?? []).filter((showId) => selectedShowIdSet.has(showId)).length;
        if (leftAssignedCount !== rightAssignedCount) {
          return rightAssignedCount - leftAssignedCount;
        }
      }
      return left.name.localeCompare(right.name);
    });
    return sorted;
  }, [availableCreators, assignmentCoverageByCreatorId, searchTermNormalized, selectedCreatorIdSet, selectedShowIdSet]);

  const creatorOptions = useMemo(
    () =>
      visibleCreators.map((creator) => {
        const coveredShowCount = (assignmentCoverageByCreatorId[creator.id] ?? []).filter((showId) => selectedShowIdSet.has(showId)).length;
        const coverageSuffix = coveredShowCount > 0
          ? ` · already on ${coveredShowCount}/${selectedShowsCount} show${selectedShowsCount === 1 ? '' : 's'}`
          : '';
        return {
          value: creator.id,
          label: `${creator.alias_name ? `${creator.name} (${creator.alias_name})` : creator.name}${coverageSuffix}`,
        };
      }),
    [assignmentCoverageByCreatorId, selectedShowIdSet, selectedShowsCount, visibleCreators],
  );

  const selectedCreators = useMemo(
    () =>
      selectedCreatorIds.map((creatorId) => ({
        id: creatorId,
        label: availableLabelByCreatorId[creatorId]
          ?? assignmentLabelByCreatorId[creatorId]
          ?? creatorId,
      })),
    [assignmentLabelByCreatorId, availableLabelByCreatorId, selectedCreatorIds],
  );

  const existingAssignedCreators = useMemo(() => {
    const records = Object.entries(assignmentCoverageByCreatorId)
      .map(([creatorId, showIds]) => ({
        creatorId,
        coveredShowCount: showIds.filter((showId) => selectedShowIdSet.has(showId)).length,
      }))
      .filter((item) => item.coveredShowCount > 0)
      .sort((left, right) => right.coveredShowCount - left.coveredShowCount);
    return records;
  }, [assignmentCoverageByCreatorId, selectedShowIdSet]);
  const impactSummary = useMemo(() => {
    const targetSet = new Set(selectedCreatorIds);
    const currentlyAssignedInScope = new Set(existingAssignedCreators.map((item) => item.creatorId));
    const addedCount = selectedCreatorIds.filter((creatorId) => !currentlyAssignedInScope.has(creatorId)).length;
    const unchangedCount = selectedCreatorIds.filter((creatorId) => currentlyAssignedInScope.has(creatorId)).length;
    const removedCount = mode === 'replace'
      ? Array.from(currentlyAssignedInScope).filter((creatorId) => !targetSet.has(creatorId)).length
      : 0;
    return {
      addedCount,
      unchangedCount,
      removedCount,
    };
  }, [existingAssignedCreators, mode, selectedCreatorIds]);

  const handleSubmit = () => {
    if (selectedCreatorIds.length === 0 || selectedShows.length === 0)
      return;
    bulkAssign(
      {
        data: {
          show_ids: selectedShows.map((s) => s.id),
          creator_ids: selectedCreatorIds,
        },
        mode,
      },
      {
        onSuccess: (response) => {
          setSelectedCreatorIds([]);
          onOpenChange(false);

          if (response.errors && response.errors.length > 0) {
            toast.warning(`Assigned creators with ${response.errors.length} error(s)`, {
              description: `Successfully added ${response.created}, but skipped ${response.errors.length} due to conflicts or limits.`,
            });
          } else {
            toast.success('Successfully assigned creators');
          }

          onSuccess();
        },
      },
    );
  };
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearchTerm('');
      setSelectedCreatorIds([]);
      setMode(defaultMode);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Assign Creators</DialogTitle>
          <DialogDescription>
            Assign creators to
            {' '}
            {selectedShows.length}
            {' '}
            selected show
            {selectedShows.length !== 1 ? 's' : ''}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Bulk mode</p>
            <Select value={mode} onValueChange={(value) => setMode(value as BulkAssignMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replace">Replace existing creators</SelectItem>
                <SelectItem value="append">Append to existing creators</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {mode === 'replace'
                ? 'Replace mode overwrites creator mapping for selected shows.'
                : 'Append mode keeps current mappings and adds selected creators.'}
            </p>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>Selected shows:</p>
            <ul className="mt-1 list-disc pl-4">
              {selectedShows.slice(0, 5).map((show) => (
                <li key={show.id}>{show.name}</li>
              ))}
              {selectedShows.length > 5 && (
                <li>
                  ...and
                  {selectedShows.length - 5}
                  {' '}
                  more
                </li>
              )}
            </ul>
          </div>

          {existingAssignedCreators.length > 0 && (
            <div className="rounded-md border bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {mode === 'replace'
                  ? 'These existing creators will be removed unless selected below'
                  : 'Already assigned in selected shows'}
                {' '}
                (
                {selectedShowsCount}
                {' '}
                show
                {selectedShowsCount === 1 ? '' : 's'}
                )
              </p>
              <div className="flex flex-wrap gap-2">
                {existingAssignedCreators.slice(0, 8).map((item) => {
                  const label = availableLabelByCreatorId[item.creatorId] ?? assignmentLabelByCreatorId[item.creatorId] ?? item.creatorId;
                  return (
                    <Badge key={item.creatorId} variant="outline">
                      {label}
                      {' '}
                      (
                      {item.coveredShowCount}
                      {' '}
                      show
                      {item.coveredShowCount === 1 ? '' : 's'}
                      )
                    </Badge>
                  );
                })}
                {existingAssignedCreators.length > 8 && (
                  <Badge variant="outline">
                    +
                    {existingAssignedCreators.length - 8}
                    {' '}
                    more
                  </Badge>
                )}
              </div>
            </div>
          )}

          <AsyncMultiCombobox
            value={selectedCreatorIds}
            onChange={setSelectedCreatorIds}
            onSearch={setSearchTerm}
            options={creatorOptions}
            isLoading={isLoadingContext}
            placeholder="Search creators by name or alias"
            emptyMessage={isLoadingContext ? 'Loading creators...' : 'No creators found for this scope'}
          />

          {selectedCreators.length > 0 && (
            <div className="rounded-md border bg-muted/10 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Selected creators</p>
              <div className="flex flex-wrap gap-2">
                {selectedCreators.map((item) => (
                  <Badge key={item.id} variant="secondary">{item.label}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-md border p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Impact preview</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                Add
                {' '}
                {impactSummary.addedCount}
              </Badge>
              <Badge variant="outline">
                Unchanged
                {' '}
                {impactSummary.unchangedCount}
              </Badge>
              {mode === 'replace' && (
                <Badge variant="destructive">
                  Remove
                  {' '}
                  {impactSummary.removedCount}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedCreatorIds.length === 0 || selectedShows.length === 0 || isPending}
          >
            {isPending ? 'Assigning...' : `Assign ${selectedCreatorIds.length > 0 ? selectedCreatorIds.length : ''} Creator${selectedCreatorIds.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
