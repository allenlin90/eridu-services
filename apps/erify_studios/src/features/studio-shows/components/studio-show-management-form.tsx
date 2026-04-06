import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import type { Resolver } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import {
  createStudioShowInputObjectSchema,
  type StudioShowDetail,
} from '@eridu/api-types/shows';
import {
  Button,
  DialogFooter,
  Form,
} from '@eridu/ui';

import {
  StudioShowClientField,
  StudioShowEndTimeField,
  StudioShowExternalIdField,
  StudioShowNameField,
  StudioShowPlatformsField,
  StudioShowRoomField,
  StudioShowScheduleField,
  StudioShowStandardField,
  StudioShowStartTimeField,
  StudioShowStatusField,
  StudioShowTypeField,
} from './studio-show-form-fields';

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

// Edit mode: schedule_id accepts either a valid schedule UID or an empty string.
// An empty string means the show is currently an orphan (no schedule) or the user
// cleared the schedule field — both are valid edit states. The submit handler converts
// empty string → null (explicit unlink) and undefined → omitted (leave unchanged).
// Create mode uses a separate schema that requires a valid schedule UID.
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
          {/* external_id is create-only; omitted on edit per Design Decision #9 */}
          {!show && <StudioShowExternalIdField control={form.control} />}

          <StudioShowNameField control={form.control} />
          <StudioShowStartTimeField control={form.control} />
          <StudioShowEndTimeField control={form.control} />

          {/* Async lookup fields — each is a memo() component that owns its hook
              internally to prevent full-form re-renders on search state changes. */}
          <StudioShowClientField control={form.control} show={show} studioId={studioId} />
          <StudioShowScheduleField control={form.control} show={show} studioId={studioId} />
          <StudioShowRoomField control={form.control} show={show} studioId={studioId} />
          <StudioShowTypeField control={form.control} show={show} studioId={studioId} />
          <StudioShowStatusField control={form.control} show={show} studioId={studioId} />
          <StudioShowStandardField control={form.control} show={show} studioId={studioId} />
          <StudioShowPlatformsField control={form.control} show={show} studioId={studioId} />
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
