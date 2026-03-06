import { Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';

import {
  AsyncCombobox,
  Badge,
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
import { sortShiftFormBlocksByStart } from '@/features/studio-shifts/utils/shift-blocks.utils';
import {
  combineDateAndTime,
  DEFAULT_END_TIME,
  DEFAULT_START_TIME,
  formatDateTime,
} from '@/features/studio-shifts/utils/shift-form.utils';

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
  const blockFeedback = useMemo(() => {
    const feedbackByBlockId = new Map<string, { inlineError: string | null; endWrapsToNextDay: boolean }>();
    const previewRows: Array<{ id: string; label: string }> = [];

    if (!formState.date) {
      for (const block of formState.blocks) {
        feedbackByBlockId.set(block.id, {
          inlineError: 'Date is required to resolve block windows.',
          endWrapsToNextDay: false,
        });
      }
      return { feedbackByBlockId, previewRows };
    }

    const sortedBlocks = sortShiftFormBlocksByStart(formState.blocks);
    let previousEndTime: Date | null = null;

    for (const block of sortedBlocks) {
      if (!block.startTime || !block.endTime) {
        feedbackByBlockId.set(block.id, {
          inlineError: 'Start and end time are required.',
          endWrapsToNextDay: false,
        });
        continue;
      }

      const startDate = new Date(combineDateAndTime(formState.date, block.startTime));
      const endDate = new Date(combineDateAndTime(formState.date, block.endTime));
      let endWrapsToNextDay = false;

      while (endDate.getTime() <= startDate.getTime()) {
        endDate.setDate(endDate.getDate() + 1);
        endWrapsToNextDay = true;
      }

      if (previousEndTime) {
        while (startDate.getTime() < previousEndTime.getTime()) {
          startDate.setDate(startDate.getDate() + 1);
          endDate.setDate(endDate.getDate() + 1);
        }
      }

      feedbackByBlockId.set(block.id, {
        inlineError: null,
        endWrapsToNextDay,
      });
      previousEndTime = endDate;

      previewRows.push({
        id: block.id,
        label: `${formatDateTime(startDate.toISOString())} -> ${formatDateTime(endDate.toISOString())}`,
      });
    }

    return { feedbackByBlockId, previewRows };
  }, [formState.blocks, formState.date]);

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
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${idPrefix}-block-${block.id}-end`} className="text-xs">End Time</Label>
                    {blockFeedback.feedbackByBlockId.get(block.id)?.endWrapsToNextDay && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        +1 day
                      </Badge>
                    )}
                  </div>
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
                {blockFeedback.feedbackByBlockId.get(block.id)?.inlineError && (
                  <p className="w-full text-xs text-destructive">
                    {blockFeedback.feedbackByBlockId.get(block.id)?.inlineError}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium">Resolved Block Window Preview</p>
            {blockFeedback.previewRows.length === 0
              ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fill date and block times to see the resolved timeline.
                  </p>
                )
              : (
                  <div className="mt-2 space-y-1">
                    {blockFeedback.previewRows.map((row, index) => (
                      <p key={row.id} className="text-xs text-muted-foreground">
                        Block
                        {' '}
                        {index + 1}
                        :
                        {' '}
                        {row.label}
                      </p>
                    ))}
                  </div>
                )}
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
