import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import type { StudioCreatorRosterItem } from '@eridu/api-types/studio-creators';
import {
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

import { studioCreatorRosterKeys, useUpdateStudioCreatorRoster } from '../api/studio-creator-roster';
import {
  buildUpdateStudioCreatorRosterPayload,
  STUDIO_CREATOR_COMPENSATION_TYPE_OPTIONS,
  type StudioCreatorCompensationTypeOption,
  UNSET_COMPENSATION_TYPE,
} from '../lib/studio-creator-compensation';

import { creatorAvailabilityKeys } from '@/features/studio-show-creators/api/get-creator-availability';
import { creatorCatalogKeys } from '@/features/studio-show-creators/api/get-creator-catalog';

type EditStudioCreatorDialogProps = {
  studioId: string;
  creator: StudioCreatorRosterItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function EditStudioCreatorForm({
  studioId,
  creator,
  onOpenChange,
}: {
  studioId: string;
  creator: StudioCreatorRosterItem;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [defaultRate, setDefaultRate] = useState(creator.default_rate ?? '');
  const [defaultRateType, setDefaultRateType] = useState<StudioCreatorCompensationTypeOption>(
    creator.default_rate_type ?? UNSET_COMPENSATION_TYPE,
  );
  const [defaultCommissionRate, setDefaultCommissionRate] = useState(creator.default_commission_rate ?? '');
  const [isActive, setIsActive] = useState(creator.is_active ? 'true' : 'false');

  const updateMutation = useUpdateStudioCreatorRoster(studioId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    let payload;
    try {
      payload = buildUpdateStudioCreatorRosterPayload({
        version: creator.version,
        defaultRate,
        defaultRateType,
        defaultCommissionRate,
        isActive: isActive === 'true',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid creator defaults');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        creatorId: creator.creator_id,
        payload,
      });
      toast.success('Creator roster updated');
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      if (err.response?.status === 409) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: studioCreatorRosterKeys.listPrefix(studioId) }),
          queryClient.invalidateQueries({ queryKey: creatorCatalogKeys.listPrefix(studioId) }),
          queryClient.invalidateQueries({ queryKey: creatorAvailabilityKeys.listPrefix(studioId) }),
        ]);
        toast.error('Creator roster changed in another session. Review the latest data and try again.');
        onOpenChange(false);
        return;
      }

      toast.error(err.response?.data?.message ?? 'Failed to update creator roster');
    }
  };

  const commissionDisabled = defaultRateType === UNSET_COMPENSATION_TYPE || defaultRateType === 'FIXED';

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="edit-default-rate">Default Rate</Label>
        <Input
          id="edit-default-rate"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={defaultRate}
          onChange={(event) => setDefaultRate(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-default-rate-type">Compensation Type</Label>
        <Select
          value={defaultRateType}
          onValueChange={(value) => setDefaultRateType(value as StudioCreatorCompensationTypeOption)}
        >
          <SelectTrigger id="edit-default-rate-type">
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
        <Label htmlFor="edit-default-commission-rate">Default Commission Rate (%)</Label>
        <Input
          id="edit-default-commission-rate"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={defaultCommissionRate}
          onChange={(event) => setDefaultCommissionRate(event.target.value)}
          disabled={commissionDisabled}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-is-active">Status</Label>
        <Select value={isActive} onValueChange={setIsActive}>
          <SelectTrigger id="edit-is-active">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={updateMutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditStudioCreatorDialog({
  studioId,
  creator,
  open,
  onOpenChange,
}: EditStudioCreatorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Edit Creator Roster Entry</DialogTitle>
          <DialogDescription>
            Update the studio defaults and roster status for
            {' '}
            {creator?.creator_name ?? 'this creator'}
            .
          </DialogDescription>
        </DialogHeader>
        {creator && (
          <EditStudioCreatorForm
            key={`${creator.id}:${creator.version}`}
            studioId={studioId}
            creator={creator}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
