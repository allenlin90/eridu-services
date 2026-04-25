import { memo } from 'react';
import type { Control } from 'react-hook-form';
import type { z } from 'zod';

import type { updateShowInputSchema } from '@eridu/api-types/shows';
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

import { useClientFieldData } from './hooks/use-client-field-data';
import { useCreatorsFieldData } from './hooks/use-creators-field-data';
import { usePlatformsFieldData } from './hooks/use-platforms-field-data';
import { useShowStandardFieldData } from './hooks/use-show-standard-field-data';
import { useShowStatusFieldData } from './hooks/use-show-status-field-data';
import { useShowTypeFieldData } from './hooks/use-show-type-field-data';
import { useStudioRoomFieldData } from './hooks/use-studio-room-field-data';

import type { Show } from '@/features/shows/api/get-shows';

type UpdateShowInput = z.infer<typeof updateShowInputSchema>;
type ShowCreatorInput = NonNullable<UpdateShowInput['creators']>[number];
type ShowPlatformInput = NonNullable<UpdateShowInput['platforms']>[number];

// Name Field (no network state)
export const ShowNameField = memo(({
  control,
}: {
  control: Control<UpdateShowInput>;
}) => {
  return (
    <FormField
      control={control}
      name="name"
      render={({ field }) => (
        <FormItem className="col-span-1 sm:col-span-2">
          <FormLabel>Name</FormLabel>
          <FormControl>
            <Input {...field} value={field.value || ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

// Time Fields (no network state)
export const ShowTimeFields = memo(({
  control,
}: {
  control: Control<UpdateShowInput>;
}) => {
  return (
    <>
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
    </>
  );
});

// Client Field (with isolated network hook)
export const ShowClientField = memo(({
  control,
  show,
}: {
  control: Control<UpdateShowInput>;
  show: Show | null;
}) => {
  const { options, isLoading, setSearch } = useClientFieldData(show);

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

// Studio Room Field (with isolated network hook)
export const ShowStudioRoomField = memo(({
  control,
  show,
}: {
  control: Control<UpdateShowInput>;
  show: Show | null;
}) => {
  const { options, isLoading, setSearch } = useStudioRoomFieldData(show);

  return (
    <FormField
      control={control}
      name="studio_room_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Studio Room</FormLabel>
          <FormControl>
            <AsyncCombobox
              value={field.value}
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

// Show Type Field (with isolated network hook)
export const ShowTypeField = memo(({
  control,
  show,
}: {
  control: Control<UpdateShowInput>;
  show: Show | null;
}) => {
  const { options, isLoading, setSearch } = useShowTypeFieldData(show);

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
              placeholder="Select type"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

// Show Status Field (with isolated network hook)
export const ShowStatusField = memo(({
  control,
  show,
}: {
  control: Control<UpdateShowInput>;
  show: Show | null;
}) => {
  const { options, isLoading, setSearch } = useShowStatusFieldData(show);

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

// Show Standard Field (with isolated network hook)
export const ShowStandardField = memo(({
  control,
  show,
}: {
  control: Control<UpdateShowInput>;
  show: Show | null;
}) => {
  const { options, isLoading, setSearch } = useShowStandardFieldData(show);

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

// Creators Field (with isolated network hook)
export const ShowCreatorsField = memo(({
  control,
  show,
}: {
  control: Control<UpdateShowInput>;
  show: Show | null;
}) => {
  const { options, isLoading, setSearch } = useCreatorsFieldData(show);

  return (
    <FormField
      control={control}
      name="creators"
      render={({ field }) => (
        <FormItem className="col-span-1 sm:col-span-2">
          <FormLabel>Creators</FormLabel>
          <FormControl>
            <AsyncMultiCombobox
              value={field.value?.map((creator) => creator.creator_id) || []}
              onChange={(ids) => {
                // Preserve existing metadata if ID exists, else create new
                const currentCreators: ShowCreatorInput[] = field.value || [];
                const newCreators = ids.map((id) => {
                  const existing = currentCreators.find((creator) => creator.creator_id === id);
                  return existing || { creator_id: id };
                });
                field.onChange(newCreators);
              }}
              onSearch={setSearch}
              options={options}
              isLoading={isLoading}
              placeholder="Select creators"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

// Platforms Field (with isolated network hook)
export const ShowPlatformsField = memo(({
  control,
  show,
}: {
  control: Control<UpdateShowInput>;
  show: Show | null;
}) => {
  const { options, isLoading, setSearch } = usePlatformsFieldData(show);

  return (
    <FormField
      control={control}
      name="platforms"
      render={({ field }) => (
        <FormItem className="col-span-1 sm:col-span-2">
          <FormLabel>Platforms</FormLabel>
          <FormControl>
            <AsyncMultiCombobox
              value={field.value?.map((platform) => platform.platform_id) || []}
              onChange={(ids) => {
                const currentPlatforms: ShowPlatformInput[] = field.value || [];
                const newPlatforms = ids.map((id) => {
                  const existing = currentPlatforms.find((platform) => platform.platform_id === id);
                  return existing || { platform_id: id };
                });
                field.onChange(newPlatforms);
              }}
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
