import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

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

import { type BulkAssignMode, useBulkAssignMcs } from '../api/bulk-assign-mcs';
import { getMcAvailability } from '../api/get-mc-availability';

import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';

type BulkMcAssignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  selectedShows: StudioShow[];
  onSuccess: () => void;
  defaultMode?: BulkAssignMode;
};

export function BulkMcAssignDialog({
  open,
  onOpenChange,
  studioId,
  selectedShows,
  onSuccess,
  defaultMode = 'append',
}: BulkMcAssignDialogProps) {
  const [mode, setMode] = useState<BulkAssignMode>(defaultMode);
  const [selectedMcIds, setSelectedMcIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { mutate: bulkAssign, isPending } = useBulkAssignMcs(studioId);

  const selectedShowsCount = selectedShows.length;
  const selectedShowIds = useMemo(() => selectedShows.map((show) => show.id), [selectedShows]);
  const selectedShowIdSet = useMemo(() => new Set(selectedShowIds), [selectedShowIds]);
  const availabilityRange = useMemo(() => {
    const startTimes = selectedShows.map((s) => s.start_time).filter(Boolean) as string[];
    const endTimes = selectedShows.map((s) => s.end_time).filter(Boolean) as string[];
    const dateFrom = startTimes.sort()[0];
    const dateTo = endTimes.sort().at(-1);
    if (!dateFrom || !dateTo) {
      return null;
    }
    return { dateFrom, dateTo };
  }, [selectedShows]);

  function normalizeSearchText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  const contextQuery = useQuery({
    queryKey: ['bulk-mc-context', studioId, availabilityRange?.dateFrom, availabilityRange?.dateTo, selectedShowIds],
    enabled: open && Boolean(availabilityRange) && selectedShows.length > 0,
    queryFn: async () => {
      const mcs = await getMcAvailability(studioId, availabilityRange!.dateFrom, availabilityRange!.dateTo);
      const coverageMap = new Map<string, Set<string>>();
      const labelMap = new Map<string, string>();
      selectedShows.forEach((show) => {
        show.mcs.forEach((assignment) => {
          if (!assignment.mc_id) {
            return;
          }
          const existingCoverage = coverageMap.get(assignment.mc_id) ?? new Set<string>();
          existingCoverage.add(show.id);
          coverageMap.set(assignment.mc_id, existingCoverage);
          if (!labelMap.has(assignment.mc_id)) {
            const label = assignment.mc_aliasname
              ? `${assignment.mc_name ?? assignment.mc_id} (${assignment.mc_aliasname})`
              : (assignment.mc_name ?? assignment.mc_id);
            labelMap.set(assignment.mc_id, label);
          }
        });
      });
      return {
        mcs,
        assignmentCoverageByMcId: Object.fromEntries(
          Array.from(coverageMap.entries()).map(([mcId, showIds]) => [mcId, Array.from(showIds)]),
        ),
        assignmentLabelByMcId: Object.fromEntries(labelMap.entries()),
      };
    },
  });
  const availableMcs: CreatorApiResponse[] = useMemo(
    () => contextQuery.data?.mcs ?? [],
    [contextQuery.data?.mcs],
  );
  const assignmentCoverageByMcId: Record<string, string[]> = useMemo(
    () => contextQuery.data?.assignmentCoverageByMcId ?? {},
    [contextQuery.data?.assignmentCoverageByMcId],
  );
  const assignmentLabelByMcId: Record<string, string> = useMemo(
    () => contextQuery.data?.assignmentLabelByMcId ?? {},
    [contextQuery.data?.assignmentLabelByMcId],
  );
  const isLoadingContext = contextQuery.isLoading || contextQuery.isFetching;

  const selectedMcIdSet = useMemo(() => new Set(selectedMcIds), [selectedMcIds]);
  const searchTermNormalized = useMemo(() => normalizeSearchText(searchTerm.trim()), [searchTerm]);
  const availableLabelByMcId = useMemo(
    () =>
      Object.fromEntries(
        availableMcs.map((mc) => [
          mc.id,
          mc.alias_name ? `${mc.name} (${mc.alias_name})` : mc.name,
        ]),
      ),
    [availableMcs],
  );
  const visibleMcs = useMemo(() => {
    const matchesSearch = (mc: CreatorApiResponse) => {
      if (!searchTermNormalized) {
        return true;
      }
      const composite = `${mc.name} ${mc.alias_name ?? ''}`;
      return normalizeSearchText(composite).includes(searchTermNormalized);
    };
    const filtered = availableMcs.filter(matchesSearch);
    const sorted = [...filtered].sort((left, right) => {
      const leftSelected = selectedMcIdSet.has(left.id) ? 1 : 0;
      const rightSelected = selectedMcIdSet.has(right.id) ? 1 : 0;
      if (leftSelected !== rightSelected) {
        return rightSelected - leftSelected;
      }
      if (!searchTermNormalized) {
        const leftAssignedCount = (assignmentCoverageByMcId[left.id] ?? []).filter((showId) => selectedShowIdSet.has(showId)).length;
        const rightAssignedCount = (assignmentCoverageByMcId[right.id] ?? []).filter((showId) => selectedShowIdSet.has(showId)).length;
        if (leftAssignedCount !== rightAssignedCount) {
          return rightAssignedCount - leftAssignedCount;
        }
      }
      return left.name.localeCompare(right.name);
    });
    return sorted;
  }, [availableMcs, assignmentCoverageByMcId, searchTermNormalized, selectedMcIdSet, selectedShowIdSet]);

  const mcOptions = useMemo(
    () =>
      visibleMcs.map((mc) => {
        const coveredShowCount = (assignmentCoverageByMcId[mc.id] ?? []).filter((showId) => selectedShowIdSet.has(showId)).length;
        const coverageSuffix = coveredShowCount > 0
          ? ` · already on ${coveredShowCount}/${selectedShowsCount} show${selectedShowsCount === 1 ? '' : 's'}`
          : '';
        return {
          value: mc.id,
          label: `${mc.alias_name ? `${mc.name} (${mc.alias_name})` : mc.name}${coverageSuffix}`,
        };
      }),
    [assignmentCoverageByMcId, selectedShowIdSet, selectedShowsCount, visibleMcs],
  );

  const selectedMcs = useMemo(
    () =>
      selectedMcIds.map((mcId) => ({
        id: mcId,
        label: availableLabelByMcId[mcId]
          ?? assignmentLabelByMcId[mcId]
          ?? mcId,
      })),
    [assignmentLabelByMcId, availableLabelByMcId, selectedMcIds],
  );

  const existingAssignedMcs = useMemo(() => {
    const records = Object.entries(assignmentCoverageByMcId)
      .map(([mcId, showIds]) => ({
        mcId,
        coveredShowCount: showIds.filter((showId) => selectedShowIdSet.has(showId)).length,
      }))
      .filter((item) => item.coveredShowCount > 0)
      .sort((left, right) => right.coveredShowCount - left.coveredShowCount);
    return records;
  }, [assignmentCoverageByMcId, selectedShowIdSet]);
  const impactSummary = useMemo(() => {
    const targetSet = new Set(selectedMcIds);
    const currentlyAssignedInScope = new Set(existingAssignedMcs.map((item) => item.mcId));
    const addedCount = selectedMcIds.filter((mcId) => !currentlyAssignedInScope.has(mcId)).length;
    const unchangedCount = selectedMcIds.filter((mcId) => currentlyAssignedInScope.has(mcId)).length;
    const removedCount = mode === 'replace'
      ? Array.from(currentlyAssignedInScope).filter((mcId) => !targetSet.has(mcId)).length
      : 0;
    return {
      addedCount,
      unchangedCount,
      removedCount,
    };
  }, [existingAssignedMcs, mode, selectedMcIds]);

  const handleSubmit = () => {
    if (selectedMcIds.length === 0 || selectedShows.length === 0)
      return;
    bulkAssign(
      {
        data: {
          show_ids: selectedShows.map((s) => s.id),
          mc_ids: selectedMcIds,
        },
        mode,
      },
      {
        onSuccess: () => {
          setSelectedMcIds([]);
          onOpenChange(false);
          onSuccess();
        },
      },
    );
  };
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearchTerm('');
      setSelectedMcIds([]);
      setMode(defaultMode);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Assign MCs</DialogTitle>
          <DialogDescription>
            Assign MCs to
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
                ? 'Replace mode overwrites MC mapping for selected shows.'
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

          {existingAssignedMcs.length > 0 && (
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
                {existingAssignedMcs.slice(0, 8).map((item) => {
                  const label = availableLabelByMcId[item.mcId] ?? assignmentLabelByMcId[item.mcId] ?? item.mcId;
                  return (
                    <Badge key={item.mcId} variant="outline">
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
                {existingAssignedMcs.length > 8 && (
                  <Badge variant="outline">
                    +
                    {existingAssignedMcs.length - 8}
                    {' '}
                    more
                  </Badge>
                )}
              </div>
            </div>
          )}

          <AsyncMultiCombobox
            value={selectedMcIds}
            onChange={setSelectedMcIds}
            onSearch={setSearchTerm}
            options={mcOptions}
            isLoading={isLoadingContext}
            placeholder="Search creators by name or alias"
            emptyMessage={isLoadingContext ? 'Loading creators...' : 'No creators found for this scope'}
          />

          {selectedMcs.length > 0 && (
            <div className="rounded-md border bg-muted/10 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Selected creators</p>
              <div className="flex flex-wrap gap-2">
                {selectedMcs.map((item) => (
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
            disabled={selectedMcIds.length === 0 || selectedShows.length === 0 || isPending}
          >
            {isPending ? 'Assigning...' : `Assign ${selectedMcIds.length > 0 ? selectedMcIds.length : ''} MC${selectedMcIds.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
