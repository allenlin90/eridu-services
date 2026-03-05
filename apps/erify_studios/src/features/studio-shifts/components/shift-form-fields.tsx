import { Plus, Trash2 } from 'lucide-react';

import {
  AsyncCombobox,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import type { Membership } from '@/features/memberships/api/get-memberships';
import type { ShiftFormState } from '@/features/studio-shifts/types/shift-form.types';
import { DEFAULT_END_TIME, DEFAULT_START_TIME } from '@/features/studio-shifts/utils/shift-form.utils';

type ShiftFormFieldsProps = {
  idPrefix: string;
  members: Membership[];
  onMemberSearch: (value: string) => void;
  isLoadingMembers?: boolean;
  formState: ShiftFormState;
  onChange: (next: ShiftFormState) => void;
  includeStatus?: boolean;
};

export function ShiftFormFields({
  idPrefix,
  members,
  onMemberSearch,
  isLoadingMembers = false,
  formState,
  onChange,
  includeStatus = false,
}: ShiftFormFieldsProps) {
  const memberOptions = members.map((member) => ({
    value: member.user.id,
    label: `${member.user.name} (${member.user.email})`,
  }));

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-user`}>Member</Label>
        <AsyncCombobox
          value={formState.userId}
          onChange={(value) => onChange({ ...formState, userId: value })}
          onSearch={onMemberSearch}
          options={memberOptions}
          isLoading={isLoadingMembers}
          placeholder="Search a studio member..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 flex flex-col">
          <Label htmlFor={`${idPrefix}-date`}>Date</Label>
          <DatePicker
            value={formState.date}
            onChange={(value) => onChange({ ...formState, date: value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-rate`}>Hourly Rate</Label>
          <Input
            id={`${idPrefix}-rate`}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={formState.hourlyRate}
            onChange={(event) => onChange({ ...formState, hourlyRate: event.target.value })}
          />
        </div>

        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Shift Blocks</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const lastBlock = formState.blocks[formState.blocks.length - 1];
                const startTime = lastBlock ? lastBlock.endTime : DEFAULT_START_TIME;
                // Add 1 hour to start time for the next block end time if possible, otherwise use DEFAULT_END_TIME
                let endTime = DEFAULT_END_TIME;
                if (startTime) {
                  const [hours, minutes] = startTime.split(':').map(Number);
                  const nextHours = (hours + 1) % 24;
                  endTime = `${String(nextHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                }

                onChange({
                  ...formState,
                  blocks: [
                    ...formState.blocks,
                    {
                      id: crypto.randomUUID(),
                      startTime,
                      endTime,
                    },
                  ],
                });
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Block
            </Button>
          </div>

          <div className="space-y-3">
            {formState.blocks.map((block, index) => (
              <div key={block.id} className="flex items-center gap-3 bg-muted/30 p-3 rounded-md border">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`${idPrefix}-block-${block.id}-start`} className="text-xs">Start Time</Label>
                  <Input
                    id={`${idPrefix}-block-${block.id}-start`}
                    type="time"
                    value={block.startTime}
                    onChange={(event) => {
                      const newBlocks = [...formState.blocks];
                      newBlocks[index] = { ...block, startTime: event.target.value };
                      onChange({ ...formState, blocks: newBlocks });
                    }}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`${idPrefix}-block-${block.id}-end`} className="text-xs">End Time</Label>
                  <Input
                    id={`${idPrefix}-block-${block.id}-end`}
                    type="time"
                    value={block.endTime}
                    onChange={(event) => {
                      const newBlocks = [...formState.blocks];
                      newBlocks[index] = { ...block, endTime: event.target.value };
                      onChange({ ...formState, blocks: newBlocks });
                    }}
                  />
                </div>
                {formState.blocks.length > 1 && (
                  <div className="pt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                      onClick={() => {
                        onChange({
                          ...formState,
                          blocks: formState.blocks.filter((b) => b.id !== block.id),
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {includeStatus && (
          <div className="space-y-2 col-span-2">
            <Label htmlFor={`${idPrefix}-status`}>Status</Label>
            <Select
              value={formState.status ?? 'SCHEDULED'}
              onValueChange={(value) =>
                onChange({
                  ...formState,
                  status: value as ShiftFormState['status'],
                })}
            >
              <SelectTrigger id={`${idPrefix}-status`}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SCHEDULED">SCHEDULED</SelectItem>
                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={formState.isDutyManager}
          onCheckedChange={(checked) => onChange({ ...formState, isDutyManager: checked === true })}
        />
        Set as duty manager
      </label>
    </div>
  );
}
