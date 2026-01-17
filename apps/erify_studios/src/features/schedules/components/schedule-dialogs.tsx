import type { z } from 'zod';

import type { ScheduleApiResponse } from '@eridu/api-types/schedules';
import { updateScheduleInputSchema } from '@eridu/api-types/schedules';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import {
  AdminFormDialog,
  DeleteConfirmDialog,
} from '@/features/admin/components';

type Schedule = ScheduleApiResponse;
type UpdateScheduleFormData = z.infer<typeof updateScheduleInputSchema>;

type ScheduleUpdateDialogProps = {
  schedule: Schedule | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateScheduleFormData) => Promise<void>;
  isLoading: boolean;
};

export function ScheduleUpdateDialog({
  schedule,
  onOpenChange,
  onSubmit,
  isLoading,
}: ScheduleUpdateDialogProps) {
  return (
    <AdminFormDialog
      open={!!schedule}
      onOpenChange={onOpenChange}
      title="Edit Schedule"
      description="Update schedule details"
      schema={updateScheduleInputSchema}
      defaultValues={
        schedule
          ? {
              name: schedule.name,
              status: schedule.status as 'draft' | 'review' | 'published',
              start_date: schedule.start_date,
              end_date: schedule.end_date,
              version: schedule.version,
            }
          : undefined
      }
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'id' as any,
          label: 'ID',
          render: () => (
            <div className="flex flex-col gap-2">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={schedule?.id || ''}
                readOnly
                onClick={(e) => {
                  e.currentTarget.select();
                  navigator.clipboard.writeText(schedule?.id || '');
                }}
                title="Click to copy ID"
              />
            </div>
          ),
        },
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Schedule name',
        },
        {
          name: 'status',
          label: 'Status',
          render: (field) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          ),
        },
        {
          name: 'start_date',
          label: 'Start Date',
          render: (field) => (
            <Input
              type="datetime-local"
              {...field}
              value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
            />
          ),
        },
        {
          name: 'end_date',
          label: 'End Date',
          render: (field) => (
            <Input
              type="datetime-local"
              {...field}
              value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
            />
          ),
        },
      ]}
    />
  );
}

type ScheduleDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function ScheduleDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: ScheduleDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Schedule"
      description="Are you sure you want to delete this schedule? This action cannot be undone."
      isLoading={isLoading}
    />
  );
}
