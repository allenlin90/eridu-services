import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import type { StudioCreatorRosterItem } from '@eridu/api-types/studio-creators';
import {
  Button,
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

type CreatorProfileFormProps = {
  studioId: string;
  creator: StudioCreatorRosterItem;
  canEdit: boolean;
};

/**
 * Studio creator roster profile form. Extracted from the former
 * `edit-studio-creator-dialog` so it can host the profile tab of the creator
 * detail route. Editable for admins and managers; read-only otherwise.
 */
export function CreatorProfileForm({ studioId, creator, canEdit }: CreatorProfileFormProps) {
  const queryClient = useQueryClient();
  const [defaultRate, setDefaultRate] = useState(creator.default_rate ?? '');
  const [defaultRateType, setDefaultRateType] = useState<StudioCreatorCompensationTypeOption>(
    (creator.default_rate_type as StudioCreatorCompensationTypeOption | null) ?? UNSET_COMPENSATION_TYPE,
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
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      if (err.response?.status === 409) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: studioCreatorRosterKeys.detail(studioId, creator.creator_id) }),
          queryClient.invalidateQueries({ queryKey: studioCreatorRosterKeys.listPrefix(studioId) }),
          queryClient.invalidateQueries({ queryKey: creatorCatalogKeys.listPrefix(studioId) }),
          queryClient.invalidateQueries({ queryKey: creatorAvailabilityKeys.listPrefix(studioId) }),
        ]);
        toast.error('Creator roster changed in another session. Review the latest data and try again.');
        return;
      }

      toast.error(err.response?.data?.message ?? 'Failed to update creator roster');
    }
  };

  const fieldsDisabled = !canEdit || updateMutation.isPending;
  const commissionDisabled = fieldsDisabled
    || defaultRateType === UNSET_COMPENSATION_TYPE
    || defaultRateType === 'FIXED';

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="max-w-md space-y-4">
      <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
        Roster edits update defaults for future show assignments only. Existing show assignments
        keep their saved compensation snapshot; edit assignment compensation to change a show.
      </p>
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
          disabled={fieldsDisabled}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-default-rate-type">Compensation Type</Label>
        <Select
          value={defaultRateType}
          onValueChange={(value) => setDefaultRateType(value as StudioCreatorCompensationTypeOption)}
          disabled={fieldsDisabled}
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
        <Select value={isActive} onValueChange={setIsActive} disabled={fieldsDisabled}>
          <SelectTrigger id="edit-is-active">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {canEdit
        ? (
            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )
        : (
            <p className="text-sm text-muted-foreground">
              You have read-only access to creator profile details.
            </p>
          )}
    </form>
  );
}
