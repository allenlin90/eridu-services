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
  Label,
} from '@eridu/ui';

import { useAddStudioCreatorToRoster } from '../api/studio-creator-roster';
import {
  buildCreateStudioCreatorRosterPayload,
  type StudioCreatorCompensationTypeOption,
  UNSET_COMPENSATION_TYPE,
} from '../lib/studio-creator-compensation';

import { CreatorCompensationFields } from './creator-compensation-fields';

import { useCreatorCatalogQuery } from '@/features/studio-show-creators/api/get-creator-catalog';

type AddStudioCreatorDialogProps = {
  studioId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MAX_ACTIVE_CREATORS_DISPLAY = 5;

export function AddStudioCreatorDialog({
  studioId,
  open,
  onOpenChange,
}: AddStudioCreatorDialogProps) {
  const [selectedCreatorId, setSelectedCreatorId] = useState('');
  const [search, setSearch] = useState('');
  const [defaultRate, setDefaultRate] = useState('');
  const [defaultRateType, setDefaultRateType] = useState<StudioCreatorCompensationTypeOption>(UNSET_COMPENSATION_TYPE);
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

  const selectedCreator = actionableCreators.find((creator) => creator.id === selectedCreatorId) ?? null;

  const resetState = () => {
    setSelectedCreatorId('');
    setSearch('');
    setDefaultRate('');
    setDefaultRateType(UNSET_COMPENSATION_TYPE);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Creator to Roster</DialogTitle>
          <DialogDescription>
            Search first to reuse an existing creator identity when possible.
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
              placeholder="Search creators by name or alias..."
              emptyMessage="No actionable creators found."
              disabled={addMutation.isPending}
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

          <CreatorCompensationFields
            defaultRate={defaultRate}
            defaultRateType={defaultRateType}
            defaultCommissionRate={defaultCommissionRate}
            onDefaultRateChange={setDefaultRate}
            onDefaultRateTypeChange={setDefaultRateType}
            onDefaultCommissionRateChange={setDefaultCommissionRate}
            disabled={addMutation.isPending}
          />

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
