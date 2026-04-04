import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import {
  createStudioShowInputSchema,
  type StudioShowDetail,
} from '@eridu/api-types/shows';
import type { StudioShowLookupsDto } from '@eridu/api-types/task-management';
import {
  AsyncCombobox,
  AsyncMultiCombobox,
  Button,
  DialogFooter,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@eridu/ui';

const studioShowFormSchema = createStudioShowInputSchema.omit({
  external_id: true,
}).extend({
  schedule_id: z.string().startsWith(UID_PREFIXES.SCHEDULE, 'Schedule is required'),
});

export type StudioShowFormValues = z.infer<typeof studioShowFormSchema>;

const EMPTY_SHOW_FORM_VALUES: StudioShowFormValues = {
  name: '',
  start_time: '',
  end_time: '',
  client_id: '',
  schedule_id: '',
  show_type_id: '',
  show_status_id: '',
  show_standard_id: '',
  studio_room_id: undefined,
  metadata: {},
  platform_ids: [],
};

type StudioShowManagementFormProps = {
  show?: StudioShowDetail | null;
  showLookups?: StudioShowLookupsDto;
  isLookupsLoading?: boolean;
  isSubmitting?: boolean;
  onSubmit: (values: StudioShowFormValues) => void;
  onCancel: () => void;
};

function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return '';
  }

  return format(new Date(value), 'yyyy-MM-dd\'T\'HH:mm');
}

export function StudioShowManagementForm({
  show,
  showLookups,
  isLookupsLoading = false,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: StudioShowManagementFormProps) {
  const form = useForm<StudioShowFormValues>({
    resolver: zodResolver(studioShowFormSchema),
    defaultValues: EMPTY_SHOW_FORM_VALUES,
  });

  useEffect(() => {
    if (show) {
      form.reset({
        name: show.name,
        start_time: show.start_time,
        end_time: show.end_time,
        client_id: show.client_id ?? '',
        schedule_id: show.schedule_id ?? '',
        show_type_id: show.show_type_id ?? '',
        show_status_id: show.show_status_id ?? '',
        show_standard_id: show.show_standard_id ?? '',
        studio_room_id: show.studio_room_id ?? undefined,
        metadata: show.metadata ?? {},
        platform_ids: show.platforms?.map((platform) => platform.id) ?? [],
      });
      return;
    }

    form.reset(EMPTY_SHOW_FORM_VALUES);
  }, [form, show]);

  const clientOptions = useMemo(
    () => (showLookups?.clients ?? []).map((client) => ({ value: client.id, label: client.name })),
    [showLookups?.clients],
  );
  const roomOptions = useMemo(
    () => (showLookups?.studio_rooms ?? []).map((room) => ({ value: room.id, label: room.name })),
    [showLookups?.studio_rooms],
  );
  const scheduleOptions = useMemo(
    () => (showLookups?.schedules ?? []).map((schedule) => ({
      value: schedule.id,
      label: `${schedule.name} (${schedule.status})`,
    })),
    [showLookups?.schedules],
  );
  const showTypeOptions = useMemo(
    () => (showLookups?.show_types ?? []).map((item) => ({ value: item.id, label: item.name })),
    [showLookups?.show_types],
  );
  const showStatusOptions = useMemo(
    () => (showLookups?.show_statuses ?? []).map((item) => ({ value: item.id, label: item.name })),
    [showLookups?.show_statuses],
  );
  const showStandardOptions = useMemo(
    () => (showLookups?.show_standards ?? []).map((item) => ({ value: item.id, label: item.name })),
    [showLookups?.show_standards],
  );
  const platformOptions = useMemo(
    () => (showLookups?.platforms ?? []).map((platform) => ({ value: platform.id, label: platform.name })),
    [showLookups?.platforms],
  );

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
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

          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="datetime-local"
                    value={toDateTimeLocalValue(field.value)}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      field.onChange(nextValue ? new Date(nextValue).toISOString() : '');
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="datetime-local"
                    value={toDateTimeLocalValue(field.value)}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      field.onChange(nextValue ? new Date(nextValue).toISOString() : '');
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <FormControl>
                  <AsyncCombobox
                    value={field.value}
                    onChange={field.onChange}
                    onSearch={() => {}}
                    options={clientOptions}
                    isLoading={isLookupsLoading}
                    placeholder="Select client"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="schedule_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schedule</FormLabel>
                <FormControl>
                  <AsyncCombobox
                    value={field.value}
                    onChange={field.onChange}
                    onSearch={() => {}}
                    options={scheduleOptions}
                    isLoading={isLookupsLoading}
                    placeholder="Select schedule"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="studio_room_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Studio Room</FormLabel>
                <FormControl>
                  <AsyncCombobox
                    value={field.value}
                    onChange={field.onChange}
                    onSearch={() => {}}
                    options={roomOptions}
                    isLoading={isLookupsLoading}
                    placeholder="Select room"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="show_type_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Show Type</FormLabel>
                <FormControl>
                  <AsyncCombobox
                    value={field.value}
                    onChange={field.onChange}
                    onSearch={() => {}}
                    options={showTypeOptions}
                    isLoading={isLookupsLoading}
                    placeholder="Select show type"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="show_status_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <AsyncCombobox
                    value={field.value}
                    onChange={field.onChange}
                    onSearch={() => {}}
                    options={showStatusOptions}
                    isLoading={isLookupsLoading}
                    placeholder="Select status"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="show_standard_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Standard</FormLabel>
                <FormControl>
                  <AsyncCombobox
                    value={field.value}
                    onChange={field.onChange}
                    onSearch={() => {}}
                    options={showStandardOptions}
                    isLoading={isLookupsLoading}
                    placeholder="Select standard"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="platform_ids"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Platforms</FormLabel>
                <FormControl>
                  <AsyncMultiCombobox
                    value={field.value ?? []}
                    onChange={field.onChange}
                    onSearch={() => {}}
                    options={platformOptions}
                    isLoading={isLookupsLoading}
                    placeholder="Select platforms"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
