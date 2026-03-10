import { useState } from 'react';

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

import type { AvailabilityWindow } from '../api/get-creator-availability';
import type { AvailableCreator } from '../api/get-creator-availability';
import { useCreatorAvailabilityQuery } from '../api/get-creator-availability';

type AddCreatorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  showStartTime: string;
  showEndTime: string;
  onAdd: (mcId: string) => void;
  isLoading: boolean;
};

export function AddCreatorDialog({
  open,
  onOpenChange,
  studioId,
  showStartTime,
  showEndTime,
  onAdd,
  isLoading,
}: AddCreatorDialogProps) {
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('');
  const [search, setSearch] = useState('');

  const availabilityWindows: AvailabilityWindow[] = [{ dateFrom: showStartTime, dateTo: showEndTime }];
  const { data: availableCreators = [], isLoading: isLoadingCreators } = useCreatorAvailabilityQuery(studioId, availabilityWindows);

  const normalizedSearch = search.toLowerCase().replace(/[^a-z0-9]/g, '');
  const filteredCreators = normalizedSearch
    ? availableCreators.filter((mc: AvailableCreator) => {
        const composite = `${mc.name} ${mc.alias_name ?? ''}`;
        return composite.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedSearch);
      })
    : availableCreators;

  const options = filteredCreators.map((mc: AvailableCreator) => ({
    value: mc.id,
    label: mc.alias_name ? `${mc.name} (${mc.alias_name})` : mc.name,
  }));

  const handleSubmit = () => {
    if (!selectedCreatorId)
      return;
    onAdd(selectedCreatorId);
    setSelectedCreatorId('');
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Creator to Show</DialogTitle>
          <DialogDescription>
            Select an available creator for this show's time slot.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <AsyncCombobox
            value={selectedCreatorId}
            onChange={setSelectedCreatorId}
            onSearch={setSearch}
            options={options}
            isLoading={isLoadingCreators}
            placeholder="Search available creators..."
            emptyMessage="No available creators found for this time slot."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedCreatorId || isLoading}>
            {isLoading ? 'Adding...' : 'Add Creator'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
