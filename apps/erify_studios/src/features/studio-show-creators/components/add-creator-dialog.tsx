import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

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
} from '@eridu/ui';

import { useCreatorAvailabilityQuery } from '../api/get-creator-availability';
import { getMissingCreatorGuidance } from '../lib/creator-roster-guidance';

type AddCreatorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  canManageRoster: boolean;
  showStartTime: string;
  showEndTime: string;
  isSubmitting: boolean;
  onSubmit: (input: StudioShowCreatorAssignmentItemInput) => void;
};

export function AddCreatorDialog({
  open,
  onOpenChange,
  studioId,
  canManageRoster,
  showStartTime,
  showEndTime,
  isSubmitting,
  onSubmit,
}: AddCreatorDialogProps) {
  const [selectedCreatorId, setSelectedCreatorId] = useState('');
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
  const handleCreatorChange = (creatorId: string) => {
    setSelectedCreatorId(creatorId);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedCreatorId('');
      setSearch('');
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    if (!selectedCreatorId) {
      return;
    }
    onSubmit({ creator_id: selectedCreatorId });
  };

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
          <p className="mt-2 text-xs text-muted-foreground">
            {getMissingCreatorGuidance(canManageRoster)}
          </p>
          {canManageRoster && (
            <Link
              to="/studios/$studioId/creators"
              params={{ studioId }}
              search={{ page: 1, limit: 10, is_active: 'true' }}
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
