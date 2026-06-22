import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  CREATOR_TYPE,
  type CreatorType,
} from '@eridu/api-types/creators';
import { STUDIO_CREATOR_ROSTER_STATE } from '@eridu/api-types/studio-creators';
import {
  AsyncCombobox,
  Button,
  Input,
  Label,
} from '@eridu/ui';

import { useStudioCreatorOnboardingUsersQuery } from '../api/get-onboarding-users';
import {
  useAddStudioCreatorToRoster,
  useOnboardStudioCreator,
} from '../api/studio-creator-roster';
import {
  buildCreateStudioCreatorRosterPayload,
  buildOnboardStudioCreatorPayload,
  type StudioCreatorCompensationTypeOption,
  UNSET_COMPENSATION_TYPE,
} from '../lib/studio-creator-compensation';

import { CreatorCompensationFields } from './creator-compensation-fields';

import { ResponsiveDialog } from '@/components/responsive-dialog';
import { CreatorTypeSelect } from '@/features/creators/components/creator-type-select';
import { useCreatorCatalogQuery } from '@/features/studio-show-creators/api/get-creator-catalog';

type AddStudioCreatorDialogProps = {
  studioId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ADD_CREATOR_FORM_ID = 'studio-creator-roster-add-form';
const ONBOARD_CREATOR_FORM_ID = 'studio-creator-roster-onboard-form';

type DialogMode = 'search' | 'create';

function formatCreatorOptionName(creator: { name: string; alias_name?: string | null }) {
  return creator.alias_name ? `${creator.name} (${creator.alias_name})` : creator.name;
}

export function AddStudioCreatorDialog({
  studioId,
  open,
  onOpenChange,
}: AddStudioCreatorDialogProps) {
  const [mode, setMode] = useState<DialogMode>('search');
  const [selectedCreatorId, setSelectedCreatorId] = useState('');
  const [search, setSearch] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [creatorAliasName, setCreatorAliasName] = useState('');
  const [creatorType, setCreatorType] = useState<CreatorType>(CREATOR_TYPE.STANDARD);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [defaultRate, setDefaultRate] = useState('');
  const [defaultRateType, setDefaultRateType] = useState<StudioCreatorCompensationTypeOption>(UNSET_COMPENSATION_TYPE);
  const [defaultCommissionRate, setDefaultCommissionRate] = useState('');

  const addMutation = useAddStudioCreatorToRoster(studioId);
  const onboardMutation = useOnboardStudioCreator(studioId);

  const { data: creators = [], isLoading } = useCreatorCatalogQuery(
    studioId,
    {
      search: search.trim().length > 0 ? search : undefined,
      include_rostered: true,
      exclude_active_rostered: true,
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
  const isPending = addMutation.isPending || onboardMutation.isPending;

  const creatorOptions = useMemo(
    () =>
      actionableCreators.map((creator) => ({
        value: creator.id,
        label: creator.roster_state === STUDIO_CREATOR_ROSTER_STATE.INACTIVE
          ? `Reactivate inactive creator: ${formatCreatorOptionName(creator)}`
          : `Add existing creator: ${formatCreatorOptionName(creator)}`,
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

  const resetCreatorFields = () => {
    setSelectedCreatorId('');
    setCreatorName('');
    setCreatorAliasName('');
    setCreatorType(CREATOR_TYPE.STANDARD);
    setSelectedUserId('');
    setUserSearch('');
    setDefaultRate('');
    setDefaultRateType(UNSET_COMPENSATION_TYPE);
    setDefaultCommissionRate('');
    addMutation.reset();
    onboardMutation.reset();
  };

  const resetState = () => {
    setMode('search');
    setSearch('');
    resetCreatorFields();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleStartCreate = () => {
    const searchedName = search.trim();
    resetCreatorFields();
    if (searchedName.length > 0) {
      setCreatorName(searchedName);
    }
    setMode('create');
  };

  const handleBackToSearch = () => {
    resetCreatorFields();
    setMode('search');
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

  const handleOnboardSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    let payload;
    try {
      payload = buildOnboardStudioCreatorPayload({
        name: creatorName,
        aliasName: creatorAliasName,
        type: creatorType,
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

  const submitDisabled = mode === 'search'
    ? isPending || !selectedCreatorId
    : isPending || creatorName.trim().length === 0 || creatorAliasName.trim().length === 0;

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => handleOpenChange(false)}
        disabled={isPending}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form={mode === 'search' ? ADD_CREATOR_FORM_ID : ONBOARD_CREATOR_FORM_ID}
        disabled={submitDisabled}
      >
        {isPending ? 'Saving...' : mode === 'search' ? 'Add selected creator to roster' : 'Create creator and add to studio'}
      </Button>
    </>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={mode === 'search' ? 'Add Creator to Roster' : 'Create New Creator'}
      description={mode === 'search'
        ? 'Search first to reuse an existing creator identity when possible.'
        : 'Create a global creator identity and add it to this studio roster.'}
      contentClassName="sm:max-w-[480px]"
      footer={footer}
    >
      {mode === 'search'
        ? (
            <form id={ADD_CREATOR_FORM_ID} onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="creator-picker">Creator</Label>
                <AsyncCombobox
                  value={selectedCreatorId}
                  onChange={setSelectedCreatorId}
                  onSearch={setSearch}
                  options={creatorOptions}
                  isLoading={isLoading}
                  placeholder="Search creators by name or alias..."
                  emptyMessage="No matching creators available. Search first, then create a new creator if this is a new identity."
                  disabled={isPending}
                />
                {selectedCreator?.roster_state === STUDIO_CREATOR_ROSTER_STATE.INACTIVE && (
                  <p className="text-xs text-muted-foreground">
                    This creator already has an inactive studio roster row and will be reactivated.
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                onClick={handleStartCreate}
                disabled={isPending}
              >
                Create new creator and add to this studio
              </Button>

              <CreatorCompensationFields
                defaultRate={defaultRate}
                defaultRateType={defaultRateType}
                defaultCommissionRate={defaultCommissionRate}
                onDefaultRateChange={setDefaultRate}
                onDefaultRateTypeChange={setDefaultRateType}
                onDefaultCommissionRateChange={setDefaultCommissionRate}
                disabled={isPending}
              />
            </form>
          )
        : (
            <form id={ONBOARD_CREATOR_FORM_ID} onSubmit={(event) => void handleOnboardSubmit(event)} className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                className="px-0"
                onClick={handleBackToSearch}
                disabled={isPending}
              >
                Back to search
              </Button>
              <div className="space-y-1.5">
                <Label htmlFor="onboard-creator-name">Name</Label>
                <Input
                  id="onboard-creator-name"
                  placeholder="Creator full name"
                  value={creatorName}
                  onChange={(event) => setCreatorName(event.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="onboard-creator-alias-name">Alias</Label>
                <Input
                  id="onboard-creator-alias-name"
                  placeholder="Display or stage name"
                  value={creatorAliasName}
                  onChange={(event) => setCreatorAliasName(event.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="onboard-creator-type">Type</Label>
                <CreatorTypeSelect
                  value={creatorType}
                  onChange={setCreatorType}
                  disabled={isPending}
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
                  disabled={isPending}
                />
              </div>

              <CreatorCompensationFields
                defaultRate={defaultRate}
                defaultRateType={defaultRateType}
                defaultCommissionRate={defaultCommissionRate}
                onDefaultRateChange={setDefaultRate}
                onDefaultRateTypeChange={setDefaultRateType}
                onDefaultCommissionRateChange={setDefaultCommissionRate}
                disabled={isPending}
              />
            </form>
          )}
    </ResponsiveDialog>
  );
}
