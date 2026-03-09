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

import type { AvailableMc } from '../api/get-mc-availability';
import { useMcAvailabilityQuery } from '../api/get-mc-availability';

type AddMcDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  showStartTime: string;
  showEndTime: string;
  onAdd: (mcId: string) => void;
  isLoading: boolean;
};

export function AddMcDialog({
  open,
  onOpenChange,
  studioId,
  showStartTime,
  showEndTime,
  onAdd,
  isLoading,
}: AddMcDialogProps) {
  const [selectedMcId, setSelectedMcId] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data: availableMcs = [], isLoading: isLoadingMcs } = useMcAvailabilityQuery(
    studioId,
    showStartTime,
    showEndTime,
  );

  const normalizedSearch = search.toLowerCase().replace(/[^a-z0-9]/g, '');
  const filteredMcs = normalizedSearch
    ? availableMcs.filter((mc: AvailableMc) => {
        const composite = `${mc.name} ${mc.alias_name ?? ''}`;
        return composite.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedSearch);
      })
    : availableMcs;

  const options = filteredMcs.map((mc: AvailableMc) => ({
    value: mc.id,
    label: mc.alias_name ? `${mc.name} (${mc.alias_name})` : mc.name,
  }));

  const handleSubmit = () => {
    if (!selectedMcId)
      return;
    onAdd(selectedMcId);
    setSelectedMcId('');
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add MC to Show</DialogTitle>
          <DialogDescription>
            Select an available MC for this show's time slot.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <AsyncCombobox
            value={selectedMcId}
            onChange={setSelectedMcId}
            onSearch={setSearch}
            options={options}
            isLoading={isLoadingMcs}
            placeholder="Search available MCs..."
            emptyMessage="No available MCs found for this time slot."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedMcId || isLoading}>
            {isLoading ? 'Adding...' : 'Add MC'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
