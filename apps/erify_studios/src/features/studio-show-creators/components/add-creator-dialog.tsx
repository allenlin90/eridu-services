import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { StudioShowCreatorAssignmentItemInput } from '@eridu/api-types/studio-creators';
import {
  AsyncCombobox,
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

import { useCreatorAvailabilityQuery } from '../api/get-creator-availability';
import {
  buildShowCreatorAssignmentInput,
  type CreatorAssignmentCompensationDraft,
} from '../lib/creator-assignment-compensation';
import { getMissingCreatorGuidance } from '../lib/creator-roster-guidance';

import {
  STUDIO_CREATOR_COMPENSATION_TYPE_OPTIONS,
  type StudioCreatorCompensationTypeOption,
  UNSET_COMPENSATION_TYPE,
} from '@/features/studio-creator-roster/lib/studio-creator-compensation';

type AddCreatorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  isAdmin: boolean;
  showStartTime: string;
  showEndTime: string;
  isSubmitting: boolean;
  onSubmit: (input: StudioShowCreatorAssignmentItemInput) => void;
};

export function AddCreatorDialog({
  open,
  onOpenChange,
  studioId,
  isAdmin,
  showStartTime,
  showEndTime,
  isSubmitting,
  onSubmit,
}: AddCreatorDialogProps) {
  const [selectedCreatorId, setSelectedCreatorId] = useState('');
  const [draft, setDraft] = useState<CreatorAssignmentCompensationDraft | null>(null);
  const [search, setSearch] = useState('');

  const { data: availableCreators = [], isLoading } = useCreatorAvailabilityQuery(
    studioId,
    {
      // TODO(phase-5): switch back to strict availability-only filtering once overlap rules are finalized.
      date_from: showStartTime,
      date_to: showEndTime,
      search: search.trim().length > 0 ? search : undefined,
      limit: 50,
    },
    open,
  );

  const options = useMemo(
    () =>
      availableCreators.map((creator) => ({
        value: creator.id,
        label: creator.alias_name
          ? `${creator.name} (${creator.alias_name})`
          : creator.name,
      })),
    [availableCreators],
  );
  const creatorById = useMemo(
    () => new Map(availableCreators.map((creator) => [creator.id, creator])),
    [availableCreators],
  );

  const buildDraftForCreator = (creatorId: string): CreatorAssignmentCompensationDraft => {
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

  const handleCreatorChange = (creatorId: string) => {
    setSelectedCreatorId(creatorId);
    setDraft(creatorId ? buildDraftForCreator(creatorId) : null);
  };

  const updateDraft = (patch: Partial<CreatorAssignmentCompensationDraft>) => {
    if (!selectedCreatorId) {
      return;
    }
    setDraft((current) => ({
      ...(current ?? buildDraftForCreator(selectedCreatorId)),
      ...patch,
    }));
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedCreatorId('');
      setDraft(null);
      setSearch('');
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    if (!selectedCreatorId) {
      return;
    }
    try {
      onSubmit(buildShowCreatorAssignmentInput(draft ?? buildDraftForCreator(selectedCreatorId)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid creator compensation input');
    }
  };
  const selectedCreator = selectedCreatorId ? creatorById.get(selectedCreatorId) : null;
  const selectedCreatorName = selectedCreator?.name ?? selectedCreatorId;
  const commissionDisabled = !draft
    || draft.compensationType === UNSET_COMPENSATION_TYPE
    || draft.compensationType === 'FIXED';

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Creator</DialogTitle>
          <DialogDescription>
            Select a creator for this show. Availability constraints are temporarily relaxed.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3">
          <AsyncCombobox
            value={selectedCreatorId}
            onChange={handleCreatorChange}
            onSearch={setSearch}
            options={options}
            isLoading={isLoading}
            placeholder="Search creators..."
            emptyMessage="No creators found."
          />
          {draft && (
            <div className="mt-4 space-y-3 rounded-md border p-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="add-creator-compensation-type">Compensation Type</Label>
                  <Select
                    value={draft.compensationType}
                    onValueChange={(value) => updateDraft({
                      compensationType: value as StudioCreatorCompensationTypeOption,
                      commissionRate: value === 'FIXED' || value === UNSET_COMPENSATION_TYPE
                        ? ''
                        : draft.commissionRate,
                    })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="add-creator-compensation-type">
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
                  <Label htmlFor="add-creator-agreed-rate">Agreed Rate</Label>
                  <Input
                    id="add-creator-agreed-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.agreedRate}
                    onChange={(event) => updateDraft({ agreedRate: event.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-creator-commission-rate">Commission Rate (%)</Label>
                  <Input
                    id="add-creator-commission-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={draft.commissionRate}
                    onChange={(event) => updateDraft({ commissionRate: event.target.value })}
                    disabled={isSubmitting || commissionDisabled}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <div className="space-y-1.5">
                  <Label htmlFor="add-creator-initial-item-amount">Initial Item Amount</Label>
                  <Input
                    id="add-creator-initial-item-amount"
                    type="number"
                    step="0.01"
                    value={draft.initialItemAmount}
                    onChange={(event) => updateDraft({ initialItemAmount: event.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-creator-initial-item-reason">Initial Item Reason</Label>
                  <Textarea
                    id="add-creator-initial-item-reason"
                    value={draft.initialItemReason}
                    onChange={(event) => updateDraft({ initialItemReason: event.target.value })}
                    disabled={isSubmitting}
                    rows={2}
                    placeholder={`Optional adjustment for ${selectedCreatorName}`}
                  />
                </div>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {getMissingCreatorGuidance(isAdmin)}
          </p>
          {isAdmin && (
            <Link
              to="/studios/$studioId/creators"
              params={{ studioId }}
              className="mt-1 inline-flex text-xs font-medium text-primary hover:underline"
            >
              Go to creator roster onboarding
            </Link>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedCreatorId}>
            {isSubmitting ? 'Adding...' : 'Add Creator'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
