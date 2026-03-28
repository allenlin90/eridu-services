import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { STUDIO_CREATOR_ROSTER_STATE } from '@eridu/api-types/studio-creators';
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
} from '@eridu/ui';

import { useAddStudioCreatorToRoster } from '../api/studio-creator-roster';
import {
  buildCreateStudioCreatorRosterPayload,
  STUDIO_CREATOR_COMPENSATION_TYPE_OPTIONS,
  type StudioCreatorCompensationTypeOption,
  UNSET_COMPENSATION_TYPE,
} from '../lib/studio-creator-compensation';

import { useCreatorCatalogQuery } from '@/features/studio-show-creators/api/get-creator-catalog';

type AddStudioCreatorDialogProps = {
  studioId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddStudioCreatorDialog({
  studioId,
  open,
  onOpenChange,
}: AddStudioCreatorDialogProps) {
  const [selectedCreatorId, setSelectedCreatorId] = useState('');
  const [search, setSearch] = useState('');
  const [defaultRate, setDefaultRate] = useState('0');
  const [defaultRateType, setDefaultRateType] = useState<StudioCreatorCompensationTypeOption>('FIXED');
  const [defaultCommissionRate, setDefaultCommissionRate] = useState('');

  const addMutation = useAddStudioCreatorToRoster(studioId);
  const { data: creators = [], isLoading } = useCreatorCatalogQuery(
    studioId,
    {
      search: search.trim().length > 0 ? search : undefined,
      include_rostered: true,
      limit: 50,
    },
    open,
  );

  const eligibleCreators = useMemo(
    () =>
      creators.filter((creator) =>
        creator.roster_state === STUDIO_CREATOR_ROSTER_STATE.NONE
        || creator.roster_state === STUDIO_CREATOR_ROSTER_STATE.INACTIVE,
      ),
    [creators],
  );

  const creatorOptions = useMemo(
    () =>
      eligibleCreators.map((creator) => ({
        value: creator.id,
        label: creator.roster_state === STUDIO_CREATOR_ROSTER_STATE.INACTIVE
          ? `${creator.name}${creator.alias_name ? ` (${creator.alias_name})` : ''} • Reactivate`
          : creator.alias_name
            ? `${creator.name} (${creator.alias_name})`
            : creator.name,
      })),
    [eligibleCreators],
  );

  const selectedCreator = eligibleCreators.find((creator) => creator.id === selectedCreatorId) ?? null;

  const resetState = () => {
    setSelectedCreatorId('');
    setSearch('');
    setDefaultRate('0');
    setDefaultRateType('FIXED');
    setDefaultCommissionRate('');
    addMutation.reset();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedCreatorId) {
      toast.error('Select a creator to add');
      return;
    }

    let payload;
    try {
      payload = buildCreateStudioCreatorRosterPayload({
        creatorId: selectedCreatorId,
        defaultRate,
        defaultRateType,
        defaultCommissionRate,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid creator defaults');
      return;
    }

    try {
      await addMutation.mutateAsync(payload);
      toast.success(
        selectedCreator?.roster_state === STUDIO_CREATOR_ROSTER_STATE.INACTIVE
          ? 'Creator reactivated in roster'
          : 'Creator added to roster',
      );
      handleOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'Failed to add creator to roster');
    }
  };

  const commissionDisabled = defaultRateType === UNSET_COMPENSATION_TYPE || defaultRateType === 'FIXED';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Creator to Roster</DialogTitle>
          <DialogDescription>
            Search the creator catalog and add or reactivate a creator for this studio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="creator-picker">Creator</Label>
            <AsyncCombobox
              value={selectedCreatorId}
              onChange={setSelectedCreatorId}
              onSearch={setSearch}
              options={creatorOptions}
              isLoading={isLoading}
              placeholder="Search creators..."
              emptyMessage="No eligible creators found."
              disabled={addMutation.isPending}
            />
            {selectedCreator?.roster_state === STUDIO_CREATOR_ROSTER_STATE.INACTIVE && (
              <p className="text-xs text-muted-foreground">
                This creator already has an inactive studio roster row and will be reactivated.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-default-rate">Default Rate</Label>
            <Input
              id="add-default-rate"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={defaultRate}
              onChange={(event) => setDefaultRate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-default-rate-type">Compensation Type</Label>
            <Select
              value={defaultRateType}
              onValueChange={(value) => setDefaultRateType(value as StudioCreatorCompensationTypeOption)}
            >
              <SelectTrigger id="add-default-rate-type">
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
            <Label htmlFor="add-default-commission-rate">Default Commission Rate (%)</Label>
            <Input
              id="add-default-commission-rate"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={defaultCommissionRate}
              onChange={(event) => setDefaultCommissionRate(event.target.value)}
              disabled={commissionDisabled}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={addMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addMutation.isPending || !selectedCreatorId}>
              {addMutation.isPending ? 'Saving...' : 'Add Creator'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
