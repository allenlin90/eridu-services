import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import type { Resolver } from 'react-hook-form';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import {
  createStudioShowInputObjectSchema,
  type StudioShowDetail,
} from '@eridu/api-types/shows';
import {
  AsyncCombobox,
  AsyncMultiCombobox,
  Button,
  DateTimePicker,
  DialogFooter,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@eridu/ui';

import {
  useStudioShowClientOptions,
  useStudioShowPlatformOptions,
  useStudioShowRoomOptions,
  useStudioShowScheduleOptions,
  useStudioShowStandardOptions,
  useStudioShowStatusOptions,
  useStudioShowTypeOptions,
} from '@/features/studio-shows/hooks/use-studio-show-form-lookup-options';

const studioShowFormBaseSchema = createStudioShowInputObjectSchema.extend({
  // Form state uses '' for empty optional text inputs; submit handlers normalize it back to undefined.
  external_id: z.string().min(1).or(z.literal('')).optional(),
});

function hasValidStudioShowTimeRange(data: { start_time: string; end_time: string }) {
  return new Date(data.end_time) > new Date(data.start_time);
}

// Create mode: schedule is required
const studioShowCreateFormSchema = studioShowFormBaseSchema
  .extend({
    schedule_id: z.string().startsWith(UID_PREFIXES.SCHEDULE, 'Schedule is required'),
  })
  .refine(hasValidStudioShowTimeRange, {
    message: 'End time must be after start time',
    path: ['end_time'],
  });

// Edit mode: schedule can be empty (shows without schedules can still be updated,
// but other fields can be updated without requiring one)
const studioShowEditFormSchema = studioShowFormBaseSchema
  .extend({
    schedule_id: z.string().startsWith(UID_PREFIXES.SCHEDULE).or(z.literal('')),
  })
  .refine(hasValidStudioShowTimeRange, {
    message: 'End time must be after start time',
    path: ['end_time'],
  });

export type StudioShowFormValues = z.infer<typeof studioShowEditFormSchema>;

const EMPTY_SHOW_FORM_VALUES: StudioShowFormValues = {
  external_id: '',
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
  studioId: string;
  show?: StudioShowDetail | null;
  isSubmitting?: boolean;
  onSubmit: (values: StudioShowFormValues) => void;
  onCancel: () => void;
};

export function StudioShowManagementForm({
  studioId,
  show,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: StudioShowManagementFormProps) {
  const form = useForm<StudioShowFormValues>({
    // Cast required: zodResolver infers the literal schema type, but both schemas are
    // structurally compatible with StudioShowFormValues at runtime.
    resolver: zodResolver(show ? studioShowEditFormSchema : studioShowCreateFormSchema) as Resolver<StudioShowFormValues>,
    defaultValues: EMPTY_SHOW_FORM_VALUES,
  });

  // M1: Detect when an editor clears the schedule on a show that previously had one
  const scheduleIdValue = useWatch({ control: form.control, name: 'schedule_id' });
  const showHasNoSchedule = !show?.schedule_id;
  const isScheduleBeingCleared = Boolean(show) && !showHasNoSchedule && !scheduleIdValue;
  const {
    options: clientOptions,
    isLoading: isClientOptionsLoading,
    setSearch: setClientSearch,
  } = useStudioShowClientOptions(show, studioId);
  const {
    options: scheduleOptions,
    isLoading: isScheduleOptionsLoading,
    setSearch: setScheduleSearch,
  } = useStudioShowScheduleOptions(show, studioId);
  const {
    options: roomOptions,
    isLoading: isRoomOptionsLoading,
    setSearch: setRoomSearch,
  } = useStudioShowRoomOptions(show, studioId);
  const {
    options: showTypeOptions,
    isLoading: isShowTypeOptionsLoading,
    setSearch: setShowTypeSearch,
  } = useStudioShowTypeOptions(show, studioId);
  const {
    options: showStatusOptions,
    isLoading: isShowStatusOptionsLoading,
    setSearch: setShowStatusSearch,
  } = useStudioShowStatusOptions(show, studioId);
  const {
    options: showStandardOptions,
    isLoading: isShowStandardOptionsLoading,
    setSearch: setShowStandardSearch,
  } = useStudioShowStandardOptions(show, studioId);
  const {
    options: platformOptions,
    isLoading: isPlatformOptionsLoading,
    setSearch: setPlatformSearch,
  } = useStudioShowPlatformOptions(show, studioId);

  useEffect(() => {
    if (show) {
      form.reset({
        external_id: '',
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
  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          {!show && (
            <FormField
              control={form.control}
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
          )}

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
                  <DateTimePicker
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    className="w-full"
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
                  <DateTimePicker
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    className="w-full"
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
                    onSearch={setClientSearch}
                    options={clientOptions}
                    isLoading={isClientOptionsLoading}
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
                    onSearch={setScheduleSearch}
                    options={scheduleOptions}
                    isLoading={isScheduleOptionsLoading}
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

          <FormField
            control={form.control}
            name="studio_room_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Studio Room</FormLabel>
                <FormControl>
                  <AsyncCombobox
                    value={field.value ?? undefined}
                    onChange={field.onChange}
                    onSearch={setRoomSearch}
                    options={roomOptions}
                    isLoading={isRoomOptionsLoading}
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
                    onSearch={setShowTypeSearch}
                    options={showTypeOptions}
                    isLoading={isShowTypeOptionsLoading}
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
                    onSearch={setShowStatusSearch}
                    options={showStatusOptions}
                    isLoading={isShowStatusOptionsLoading}
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
                    onSearch={setShowStandardSearch}
                    options={showStandardOptions}
                    isLoading={isShowStandardOptionsLoading}
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
                    onSearch={setPlatformSearch}
                    options={platformOptions}
                    isLoading={isPlatformOptionsLoading}
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
