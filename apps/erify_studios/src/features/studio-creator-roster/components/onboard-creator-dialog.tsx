import { useMemo, useState } from 'react';
import { toast } from 'sonner';

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
} from '@eridu/ui';

import { useStudioCreatorOnboardingUsersQuery } from '../api/get-onboarding-users';
import { useOnboardStudioCreator } from '../api/studio-creator-roster';
import {
  buildOnboardStudioCreatorPayload,
  type StudioCreatorCompensationTypeOption,
  UNSET_COMPENSATION_TYPE,
} from '../lib/studio-creator-compensation';

import { CreatorCompensationFields } from './creator-compensation-fields';

type OnboardCreatorDialogProps = {
  studioId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OnboardCreatorDialog({
  studioId,
  open,
  onOpenChange,
}: OnboardCreatorDialogProps) {
  const [creatorName, setCreatorName] = useState('');
  const [creatorAliasName, setCreatorAliasName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [defaultRate, setDefaultRate] = useState('');
  const [defaultRateType, setDefaultRateType] = useState<StudioCreatorCompensationTypeOption>(UNSET_COMPENSATION_TYPE);
  const [defaultCommissionRate, setDefaultCommissionRate] = useState('');

  const onboardMutation = useOnboardStudioCreator(studioId);

  const { data: onboardingUsers = [], isLoading: isLoadingOnboardingUsers } = useStudioCreatorOnboardingUsersQuery(
    studioId,
    {
      search: userSearch.trim(),
      limit: 20,
    },
    open,
  );

  const userOptions = useMemo(
    () =>
      onboardingUsers.map((user) => ({
        value: user.id,
        label: user.email ? `${user.name} (${user.email})` : user.name,
      })),
    [onboardingUsers],
  );

  const resetState = () => {
    setCreatorName('');
    setCreatorAliasName('');
    setSelectedUserId('');
    setUserSearch('');
    setDefaultRate('');
    setDefaultRateType(UNSET_COMPENSATION_TYPE);
    setDefaultCommissionRate('');
    onboardMutation.reset();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    let payload;
    try {
      payload = buildOnboardStudioCreatorPayload({
        name: creatorName,
        aliasName: creatorAliasName,
        userId: selectedUserId || undefined,
        defaultRate,
        defaultRateType,
        defaultCommissionRate,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid onboarding payload');
      return;
    }

    try {
      await onboardMutation.mutateAsync(payload);
      toast.success('Creator created and onboarded to roster');
      handleOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'Failed to onboard creator');
    }
  };

  const submitDisabled = onboardMutation.isPending
    || creatorName.trim().length === 0
    || creatorAliasName.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Onboard New Creator</DialogTitle>
          <DialogDescription>
            New creators are global identities shared across studios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="onboard-creator-name">Name</Label>
            <Input
              id="onboard-creator-name"
              placeholder="Creator full name"
              value={creatorName}
              onChange={(event) => setCreatorName(event.target.value)}
              disabled={onboardMutation.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="onboard-creator-alias-name">Alias</Label>
            <Input
              id="onboard-creator-alias-name"
              placeholder="Display or stage name"
              value={creatorAliasName}
              onChange={(event) => setCreatorAliasName(event.target.value)}
              disabled={onboardMutation.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="onboard-creator-user-link">User link (optional)</Label>
            <AsyncCombobox
              value={selectedUserId}
              onChange={setSelectedUserId}
              onSearch={setUserSearch}
              options={userOptions}
              isLoading={isLoadingOnboardingUsers}
              placeholder="Search users by name, email, or ID..."
              emptyMessage="No eligible users found. Linking can be skipped for now."
              disabled={onboardMutation.isPending}
            />
          </div>

          <CreatorCompensationFields
            defaultRate={defaultRate}
            defaultRateType={defaultRateType}
            defaultCommissionRate={defaultCommissionRate}
            onDefaultRateChange={setDefaultRate}
            onDefaultRateTypeChange={setDefaultRateType}
            onDefaultCommissionRateChange={setDefaultCommissionRate}
            disabled={onboardMutation.isPending}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={onboardMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {onboardMutation.isPending ? 'Saving...' : 'Create & Onboard'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
