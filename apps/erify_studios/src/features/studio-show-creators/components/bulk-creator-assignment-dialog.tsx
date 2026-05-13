import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  BULK_ASSIGN_MAX_CREATORS_PER_SHOW,
  BULK_ASSIGN_MAX_SHOWS,
  type BulkShowCreatorAssignmentResponse,
  STUDIO_CREATOR_ROSTER_ERROR,
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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import { useBulkAssignCreatorsToShows } from '../api/bulk-assign-creators-to-shows';
import { useCreatorCatalogQuery } from '../api/get-creator-catalog';
import {
  buildShowCreatorAssignmentInput,
  type CreatorAssignmentCompensationDraft,
} from '../lib/creator-assignment-compensation';
import {
  getMissingCreatorGuidance,
  getRosterAssignmentFailureMessage,
} from '../lib/creator-roster-guidance';

import {
  STUDIO_CREATOR_COMPENSATION_TYPE_OPTIONS,
  type StudioCreatorCompensationTypeOption,
  UNSET_COMPENSATION_TYPE,
} from '@/features/studio-creator-roster/lib/studio-creator-compensation';
import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

const MAX_ERRORS_DISPLAYED = 12;

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
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, CreatorAssignmentCompensationDraft>>({});
  const [creatorSearch, setCreatorSearch] = useState('');
  const [assignmentSummary, setAssignmentSummary] = useState<BulkShowCreatorAssignmentResponse | null>(null);
  const { role } = useStudioAccess(studioId);
  const isAdmin = role === STUDIO_ROLE.ADMIN;

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
  const showNameById = useMemo(
    () => new Map(shows.map((show) => [show.id, show.name])),
    [shows],
  );
  const creatorNameById = useMemo(
    () => new Map(creators.map((creator) => [creator.id, creator.name])),
    [creators],
  );
  const creatorById = useMemo(
    () => new Map(creators.map((creator) => [creator.id, creator])),
    [creators],
  );

  const createDraftForCreator = (creatorId: string): CreatorAssignmentCompensationDraft => {
    const creator = creatorById.get(creatorId);

    return {
      creatorId,
      compensationType: creator?.default_rate_type ?? UNSET_COMPENSATION_TYPE,
      agreedRate: creator?.default_rate ?? '',
      commissionRate: creator?.default_commission_rate ?? '',
      initialItemAmount: '',
      initialItemType: 'BONUS',
      initialItemReason: '',
    };
  };

  const handleCreatorSelectionChange = (nextCreatorIds: string[]) => {
    setSelectedCreatorIds(nextCreatorIds);
    setAssignmentDrafts((current) => {
      const nextDrafts: Record<string, CreatorAssignmentCompensationDraft> = {};
      nextCreatorIds.forEach((creatorId) => {
        nextDrafts[creatorId] = current[creatorId] ?? createDraftForCreator(creatorId);
      });
      return nextDrafts;
    });
  };

  const updateDraft = (
    creatorId: string,
    patch: Partial<CreatorAssignmentCompensationDraft>,
  ) => {
    setAssignmentDrafts((current) => ({
      ...current,
      [creatorId]: {
        ...(current[creatorId] ?? createDraftForCreator(creatorId)),
        ...patch,
      },
    }));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedCreatorIds([]);
      setAssignmentDrafts({});
      setCreatorSearch('');
      setAssignmentSummary(null);
    }
    onOpenChange(nextOpen);
  };

  const { mutate: assignCreators, isPending: isAssigning } = useBulkAssignCreatorsToShows({
    studioId,
    onSuccess: (response) => {
      setAssignmentSummary(response);

      if (response.errors.length === 0) {
        handleOpenChange(false);
        onSuccess?.();
      } else if (response.created > 0) {
        // Partial success: some assignments were created — notify the parent so it can refresh.
        onSuccess?.();
      }
    },
  });

  const creatorLimitExceeded = selectedCreatorIds.length > BULK_ASSIGN_MAX_CREATORS_PER_SHOW;
  const showLimitExceeded = shows.length > BULK_ASSIGN_MAX_SHOWS;

  const handleAssign = () => {
    if (selectedCreatorIds.length === 0 || shows.length === 0 || creatorLimitExceeded || showLimitExceeded) {
      return;
    }

    setAssignmentSummary(null);
    assignCreators({
      show_ids: shows.map((show) => show.id),
      creators: selectedCreatorIds.map((creatorId) =>
        buildShowCreatorAssignmentInput(assignmentDrafts[creatorId] ?? createDraftForCreator(creatorId))),
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
              onChange={handleCreatorSelectionChange}
              onSearch={setCreatorSearch}
              options={creatorOptions}
              isLoading={isLoadingCreators}
              placeholder="Search creators..."
              emptyMessage="No creators found."
              disabled={isAssigning}
            />
            <p className="text-xs text-muted-foreground">
              {getMissingCreatorGuidance(isAdmin)}
            </p>
            {isAdmin && (
              <Link
                to="/studios/$studioId/creators"
                params={{ studioId }}
                className="inline-flex text-xs font-medium text-primary hover:underline"
              >
                Go to creator roster onboarding
              </Link>
            )}
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

          {selectedCreatorIds.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Assignment Compensation</p>
              {selectedCreatorIds.map((creatorId) => {
                const draft = assignmentDrafts[creatorId] ?? createDraftForCreator(creatorId);
                const creatorName = creatorNameById.get(creatorId) ?? creatorId;
                const commissionDisabled = draft.compensationType === UNSET_COMPENSATION_TYPE
                  || draft.compensationType === 'FIXED';

                return (
                  <div key={creatorId} className="space-y-3 rounded-md border p-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{creatorName}</span>
                      <span className="text-xs text-muted-foreground">Prefilled from roster defaults</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`assignment-compensation-type-${creatorId}`}>
                          Compensation type for
                          {' '}
                          {creatorName}
                        </Label>
                        <Select
                          value={draft.compensationType}
                          onValueChange={(value) => updateDraft(creatorId, {
                            compensationType: value as StudioCreatorCompensationTypeOption,
                            commissionRate: value === 'FIXED' || value === UNSET_COMPENSATION_TYPE
                              ? ''
                              : draft.commissionRate,
                          })}
                          disabled={isAssigning}
                        >
                          <SelectTrigger id={`assignment-compensation-type-${creatorId}`}>
                            <SelectValue placeholder="Select compensation type" />
                          </SelectTrigger>
                          <SelectContent>
                            {STUDIO_CREATOR_COMPENSATION_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`assignment-agreed-rate-${creatorId}`}>
                          Agreed rate for
                          {' '}
                          {creatorName}
                        </Label>
                        <Input
                          id={`assignment-agreed-rate-${creatorId}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.agreedRate}
                          onChange={(event) => updateDraft(creatorId, { agreedRate: event.target.value })}
                          disabled={isAssigning}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`assignment-commission-rate-${creatorId}`}>
                          Commission rate for
                          {' '}
                          {creatorName}
                        </Label>
                        <Input
                          id={`assignment-commission-rate-${creatorId}`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={draft.commissionRate}
                          onChange={(event) => updateDraft(creatorId, { commissionRate: event.target.value })}
                          disabled={isAssigning || commissionDisabled}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                      <div className="space-y-1.5">
                        <Label htmlFor={`assignment-initial-item-amount-${creatorId}`}>
                          Initial item amount for
                          {' '}
                          {creatorName}
                        </Label>
                        <Input
                          id={`assignment-initial-item-amount-${creatorId}`}
                          type="number"
                          step="0.01"
                          value={draft.initialItemAmount}
                          onChange={(event) => updateDraft(creatorId, { initialItemAmount: event.target.value })}
                          disabled={isAssigning}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`assignment-initial-item-reason-${creatorId}`}>
                          Initial item reason for
                          {' '}
                          {creatorName}
                        </Label>
                        <Textarea
                          id={`assignment-initial-item-reason-${creatorId}`}
                          value={draft.initialItemReason}
                          onChange={(event) => updateDraft(creatorId, { initialItemReason: event.target.value })}
                          disabled={isAssigning}
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {assignmentSummary && assignmentSummary.errors.length > 0 && (
            <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
              <p className="font-medium">
                Some assignments were not completed (
                {assignmentSummary.errors.length}
                ).
              </p>
              <ul className="max-h-28 space-y-1 overflow-y-auto pr-1">
                {assignmentSummary.errors.slice(0, MAX_ERRORS_DISPLAYED).map((error) => {
                  const showName = showNameById.get(error.show_id) ?? error.show_id;
                  const creatorName = creatorNameById.get(error.creator_id) ?? error.creator_id;
                  const reason = getRosterAssignmentFailureMessage(error.reason, isAdmin);

                  return (
                    <li key={`${error.show_id}-${error.creator_id}-${error.reason}`}>
                      <span className="font-medium">{showName}</span>
                      {' '}
                      •
                      {' '}
                      <span className="font-medium">{creatorName}</span>
                      {' '}
                      •
                      {' '}
                      {reason}
                    </li>
                  );
                })}
                {assignmentSummary.errors.length > MAX_ERRORS_DISPLAYED && (
                  <li className="text-amber-700">
                    +
                    {assignmentSummary.errors.length - MAX_ERRORS_DISPLAYED}
                    {' '}
                    more
                  </li>
                )}
              </ul>
              {assignmentSummary.errors.some((error) => error.reason === STUDIO_CREATOR_ROSTER_ERROR.CREATOR_NOT_IN_ROSTER)
              && isAdmin && (
                <Link
                  to="/studios/$studioId/creators"
                  params={{ studioId }}
                  className="inline-flex pt-1 font-medium text-primary hover:underline"
                >
                  Onboard missing creators in roster
                </Link>
              )}
            </div>
          )}
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
