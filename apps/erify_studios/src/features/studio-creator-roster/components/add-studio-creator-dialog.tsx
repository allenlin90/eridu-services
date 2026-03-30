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

import { useStudioCreatorOnboardingUsersQuery } from '../api/get-onboarding-users';
import {
  useAddStudioCreatorToRoster,
  useOnboardStudioCreator,
} from '../api/studio-creator-roster';
import {
  buildCreateStudioCreatorRosterPayload,
  buildOnboardStudioCreatorPayload,
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

const MAX_ACTIVE_CREATORS_DISPLAY = 5;

type AddStudioCreatorDialogMode = 'search' | 'create';

export function AddStudioCreatorDialog({
  studioId,
  open,
  onOpenChange,
}: AddStudioCreatorDialogProps) {
  const [mode, setMode] = useState<AddStudioCreatorDialogMode>('search');
  const [selectedCreatorId, setSelectedCreatorId] = useState('');
  const [search, setSearch] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [creatorAliasName, setCreatorAliasName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [defaultRate, setDefaultRate] = useState('');
  const [defaultRateType, setDefaultRateType] = useState<StudioCreatorCompensationTypeOption>(UNSET_COMPENSATION_TYPE);
  const [defaultCommissionRate, setDefaultCommissionRate] = useState('');

  const addMutation = useAddStudioCreatorToRoster(studioId);
  const onboardMutation = useOnboardStudioCreator(studioId);
  const isSubmitting = addMutation.isPending || onboardMutation.isPending;

  const { data: creators = [], isLoading } = useCreatorCatalogQuery(
    studioId,
    {
      search: search.trim().length > 0 ? search : undefined,
      include_rostered: true,
      limit: 50,
    },
    open,
  );

  const { data: onboardingUsers = [], isLoading: isLoadingOnboardingUsers } = useStudioCreatorOnboardingUsersQuery(
    studioId,
    {
      search: userSearch.trim(),
      limit: 20,
    },
    open && mode === 'create',
  );

  const actionableCreators = useMemo(
    () =>
      creators.filter((creator) =>
        creator.roster_state === STUDIO_CREATOR_ROSTER_STATE.NONE
        || creator.roster_state === STUDIO_CREATOR_ROSTER_STATE.INACTIVE,
      ),
    [creators],
  );
  const activeCreators = useMemo(
    () => creators.filter((creator) => creator.roster_state === STUDIO_CREATOR_ROSTER_STATE.ACTIVE),
    [creators],
  );
  const hasSearchedCatalog = search.trim().length > 0;

  const creatorOptions = useMemo(
    () =>
      actionableCreators.map((creator) => ({
        value: creator.id,
        label: creator.roster_state === STUDIO_CREATOR_ROSTER_STATE.INACTIVE
          ? `${creator.name}${creator.alias_name ? ` (${creator.alias_name})` : ''} • Reactivate`
          : creator.alias_name
            ? `${creator.name} (${creator.alias_name})`
            : creator.name,
      })),
    [actionableCreators],
  );
  const userOptions = useMemo(
    () =>
      onboardingUsers.map((user) => ({
        value: user.id,
        label: user.email ? `${user.name} (${user.email})` : user.name,
      })),
    [onboardingUsers],
  );

  const selectedCreator = actionableCreators.find((creator) => creator.id === selectedCreatorId) ?? null;

  const resetState = () => {
    setMode('search');
    setSelectedCreatorId('');
    setSearch('');
    setCreatorName('');
    setCreatorAliasName('');
    setSelectedUserId('');
    setUserSearch('');
    setDefaultRate('');
    setDefaultRateType(UNSET_COMPENSATION_TYPE);
    setDefaultCommissionRate('');
    addMutation.reset();
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

    if (mode === 'search') {
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
      return;
    }

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

  const commissionDisabled = defaultRateType === UNSET_COMPENSATION_TYPE || defaultRateType === 'FIXED';
  const showCreateCta = mode === 'search' && hasSearchedCatalog;
  const submitDisabled = mode === 'search'
    ? !selectedCreatorId
    : creatorName.trim().length === 0 || creatorAliasName.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Creator to Roster</DialogTitle>
          <DialogDescription>
            {mode === 'search'
              ? 'Search first to reuse an existing creator identity when possible.'
              : 'New creators are global identities shared across studios.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          {mode === 'search'
            ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="creator-picker">Creator</Label>
                    <AsyncCombobox
                      value={selectedCreatorId}
                      onChange={setSelectedCreatorId}
                      onSearch={setSearch}
                      options={creatorOptions}
                      isLoading={isLoading}
                      placeholder="Search creators by name or alias..."
                      emptyMessage="No actionable creators found."
                      disabled={isSubmitting}
                    />
                    {selectedCreator?.roster_state === STUDIO_CREATOR_ROSTER_STATE.INACTIVE && (
                      <p className="text-xs text-muted-foreground">
                        This creator already has an inactive studio roster row and will be reactivated.
                      </p>
                    )}
                  </div>

                  {hasSearchedCatalog && activeCreators.length > 0 && (
                    <div className="rounded-md border bg-muted/30 p-2.5">
                      <p className="text-xs font-medium text-muted-foreground">Already active in this studio</p>
                      <ul className="mt-1 space-y-1">
                        {activeCreators.slice(0, MAX_ACTIVE_CREATORS_DISPLAY).map((creator) => (
                          <li key={creator.id} className="text-xs">
                            {creator.alias_name ? `${creator.name} (${creator.alias_name})` : creator.name}
                          </li>
                        ))}
                        {activeCreators.length > MAX_ACTIVE_CREATORS_DISPLAY && (
                          <li className="text-xs text-muted-foreground">
                            +
                            {activeCreators.length - MAX_ACTIVE_CREATORS_DISPLAY}
                            {' '}
                            more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )
            : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="creator-name">Name</Label>
                    <Input
                      id="creator-name"
                      placeholder="Creator full name"
                      value={creatorName}
                      onChange={(event) => setCreatorName(event.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="creator-alias-name">Alias</Label>
                    <Input
                      id="creator-alias-name"
                      placeholder="Display or stage name"
                      value={creatorAliasName}
                      onChange={(event) => setCreatorAliasName(event.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="creator-user-link">User link (optional)</Label>
                    <AsyncCombobox
                      value={selectedUserId}
                      onChange={setSelectedUserId}
                      onSearch={setUserSearch}
                      options={userOptions}
                      isLoading={isLoadingOnboardingUsers}
                      placeholder="Search users by name, email, or ID..."
                      emptyMessage="No eligible users found. Linking can be skipped for now."
                      disabled={isSubmitting}
                    />
                  </div>
                </>
              )}
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
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-default-rate-type">Compensation Type</Label>
            <Select
              value={defaultRateType}
              onValueChange={(value) => setDefaultRateType(value as StudioCreatorCompensationTypeOption)}
              disabled={isSubmitting}
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
              disabled={commissionDisabled || isSubmitting}
            />
          </div>
          {showCreateCta && (
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start px-2"
              onClick={() => setMode('create')}
              disabled={isSubmitting}
            >
              Create and onboard new creator
            </Button>
          )}
          {mode === 'create' && (
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start px-2"
              onClick={() => {
                setMode('search');
                setUserSearch('');
              }}
              disabled={isSubmitting}
            >
              Back to search
            </Button>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || submitDisabled}>
              {isSubmitting
                ? 'Saving...'
                : mode === 'search'
                  ? 'Add Creator'
                  : 'Create & Onboard'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
