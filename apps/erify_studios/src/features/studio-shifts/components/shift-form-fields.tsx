import {
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

type ShiftFormFieldsProps = {
  idPrefix: string;
  members: Membership[];
  formState: ShiftFormState;
  onChange: (next: ShiftFormState) => void;
  includeStatus?: boolean;
};

export function ShiftFormFields({
  idPrefix,
  members,
  formState,
  onChange,
  includeStatus = false,
}: ShiftFormFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-user`}>Member</Label>
        <Select
          value={formState.userId}
          onValueChange={(value) => onChange({ ...formState, userId: value })}
        >
          <SelectTrigger id={`${idPrefix}-user`}>
            <SelectValue placeholder="Select member" />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.user.id}>
                {member.user.name}
                {' '}
                (
                {member.user.email}
                )
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 flex flex-col">
          <Label htmlFor={`${idPrefix}-date`}>Date</Label>
          <DatePicker
            value={formState.date}
            onChange={(val) => onChange({ ...formState, date: val })}
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

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-start`}>Start Time</Label>
          <Input
            id={`${idPrefix}-start`}
            type="time"
            value={formState.startTime}
            onChange={(event) => onChange({ ...formState, startTime: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-end`}>End Time</Label>
          <Input
            id={`${idPrefix}-end`}
            type="time"
            value={formState.endTime}
            onChange={(event) => onChange({ ...formState, endTime: event.target.value })}
          />
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
