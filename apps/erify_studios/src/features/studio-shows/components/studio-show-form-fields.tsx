import { AlertTriangle } from 'lucide-react';
import { memo } from 'react';
import type { Control } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import type { StudioShowDetail } from '@eridu/api-types/shows';
import {
  AsyncCombobox,
  AsyncMultiCombobox,
  DateTimePicker,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@eridu/ui';

import type { StudioShowFormValues } from './studio-show-management-form';

import {
  useStudioShowClientOptions,
  useStudioShowPlatformOptions,
  useStudioShowRoomOptions,
  useStudioShowScheduleOptions,
  useStudioShowStandardOptions,
  useStudioShowStatusOptions,
  useStudioShowTypeOptions,
} from '@/features/studio-shows/hooks/use-studio-show-form-lookup-options';

type FieldProps = {
  control: Control<StudioShowFormValues>;
  show: StudioShowDetail | null | undefined;
  studioId: string;
};

// External ID — create-only field. Hidden on edit per Design Decision #9.
export const StudioShowExternalIdField = memo(({ control }: { control: Control<StudioShowFormValues> }) => (
  <FormField
    control={control}
    name="external_id"
    render={({ field }) => (
      <FormItem className="md:col-span-2">
        <FormLabel>External ID</FormLabel>
        <FormControl>
          <Input
            {...field}
            value={field.value ?? ''}
            placeholder="Optional external identifier"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
));

// Name
export const StudioShowNameField = memo(({ control }: { control: Control<StudioShowFormValues> }) => (
  <FormField
    control={control}
    name="name"
    render={({ field }) => (
      <FormItem className="md:col-span-2">
        <FormLabel>Name</FormLabel>
        <FormControl>
          <Input {...field} value={field.value ?? ''} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
));

// Start Time
export const StudioShowStartTimeField = memo(({ control }: { control: Control<StudioShowFormValues> }) => (
  <FormField
    control={control}
    name="start_time"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Start Time</FormLabel>
        <FormControl>
          <DateTimePicker value={field.value ?? ''} onChange={field.onChange} className="w-full" />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
));

// End Time
export const StudioShowEndTimeField = memo(({ control }: { control: Control<StudioShowFormValues> }) => (
  <FormField
    control={control}
    name="end_time"
    render={({ field }) => (
      <FormItem>
        <FormLabel>End Time</FormLabel>
        <FormControl>
          <DateTimePicker value={field.value ?? ''} onChange={field.onChange} className="w-full" />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
));

// Client — isolated async hook, re-renders only when client search changes
export const StudioShowClientField = memo(({ control, show, studioId }: FieldProps) => {
  const { options, isLoading, setSearch } = useStudioShowClientOptions(show, studioId);

  return (
    <FormField
      control={control}
      name="client_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Client</FormLabel>
          <FormControl>
            <AsyncCombobox
              value={field.value}
              onChange={field.onChange}
              onSearch={setSearch}
              options={options}
              isLoading={isLoading}
              placeholder="Select client"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

// Schedule — isolated async hook + useWatch for the orphan-clear warning.
// useWatch lives here so that only this field re-renders when schedule_id changes.
export const StudioShowScheduleField = memo(({ control, show, studioId }: FieldProps) => {
  const { options, isLoading, setSearch } = useStudioShowScheduleOptions(show, studioId);

  const scheduleIdValue = useWatch({ control, name: 'schedule_id' });
  const showHasNoSchedule = !show?.schedule_id;
  const isScheduleBeingCleared = Boolean(show) && !showHasNoSchedule && !scheduleIdValue;

  return (
    <FormField
      control={control}
      name="schedule_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Schedule</FormLabel>
          <FormControl>
            <AsyncCombobox
              value={field.value}
              onChange={field.onChange}
              onSearch={setSearch}
              options={options}
              isLoading={isLoading}
              placeholder="Select schedule"
            />
          </FormControl>
          {isScheduleBeingCleared && (
            <p className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Clearing the schedule will leave this show unassigned. Assign a schedule to keep it linked.
            </p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

// Studio Room — isolated async hook
export const StudioShowRoomField = memo(({ control, show, studioId }: FieldProps) => {
  const { options, isLoading, setSearch } = useStudioShowRoomOptions(show, studioId);

  return (
    <FormField
      control={control}
      name="studio_room_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Studio Room</FormLabel>
          <FormControl>
            <AsyncCombobox
              value={field.value ?? undefined}
              onChange={field.onChange}
              onSearch={setSearch}
              options={options}
              isLoading={isLoading}
              placeholder="Select room"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

// Show Type — isolated async hook
export const StudioShowTypeField = memo(({ control, show, studioId }: FieldProps) => {
  const { options, isLoading, setSearch } = useStudioShowTypeOptions(show, studioId);

  return (
    <FormField
      control={control}
      name="show_type_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Show Type</FormLabel>
          <FormControl>
            <AsyncCombobox
              value={field.value}
              onChange={field.onChange}
              onSearch={setSearch}
              options={options}
              isLoading={isLoading}
              placeholder="Select show type"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

// Show Status — isolated async hook; filtering is client-side (see use-studio-show-form-lookup-options.ts)
export const StudioShowStatusField = memo(({ control, show, studioId }: FieldProps) => {
  const { options, isLoading, setSearch } = useStudioShowStatusOptions(show, studioId);

  return (
    <FormField
      control={control}
      name="show_status_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Status</FormLabel>
          <FormControl>
            <AsyncCombobox
              value={field.value}
              onChange={field.onChange}
              onSearch={setSearch}
              options={options}
              isLoading={isLoading}
              placeholder="Select status"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

// Show Standard — isolated async hook
export const StudioShowStandardField = memo(({ control, show, studioId }: FieldProps) => {
  const { options, isLoading, setSearch } = useStudioShowStandardOptions(show, studioId);

  return (
    <FormField
      control={control}
      name="show_standard_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Standard</FormLabel>
          <FormControl>
            <AsyncCombobox
              value={field.value}
              onChange={field.onChange}
              onSearch={setSearch}
              options={options}
              isLoading={isLoading}
              placeholder="Select standard"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

// Platforms — isolated async hook
export const StudioShowPlatformsField = memo(({ control, show, studioId }: FieldProps) => {
  const { options, isLoading, setSearch } = useStudioShowPlatformOptions(show, studioId);

  return (
    <FormField
      control={control}
      name="platform_ids"
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Platforms</FormLabel>
          <FormControl>
            <AsyncMultiCombobox
              value={field.value ?? []}
              onChange={field.onChange}
              onSearch={setSearch}
              options={options}
              isLoading={isLoading}
              placeholder="Select platforms"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});
