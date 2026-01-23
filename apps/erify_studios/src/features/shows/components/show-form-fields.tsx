import { format } from 'date-fns';
import { memo } from 'react';
import type { Control } from 'react-hook-form';
import type { z } from 'zod';

import type { updateShowInputSchema } from '@eridu/api-types/shows';
import {
  AsyncCombobox,
  AsyncMultiCombobox,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@eridu/ui';

import { useClientFieldData } from './hooks/use-client-field-data';
import { useMcsFieldData } from './hooks/use-mcs-field-data';
import { usePlatformsFieldData } from './hooks/use-platforms-field-data';
import { useShowStandardFieldData } from './hooks/use-show-standard-field-data';
import { useShowStatusFieldData } from './hooks/use-show-status-field-data';
import { useShowTypeFieldData } from './hooks/use-show-type-field-data';
import { useStudioRoomFieldData } from './hooks/use-studio-room-field-data';

import type { Show } from '@/features/shows/api/get-shows';

type UpdateShowInput = z.infer<typeof updateShowInputSchema>;

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
              <Input
                {...field}
                type="datetime-local"
                value={field.value ? format(new Date(field.value), 'yyyy-MM-dd\'T\'HH:mm') : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val ? new Date(val).toISOString() : '');
                }}
              />
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
              <Input
                {...field}
                type="datetime-local"
                value={field.value ? format(new Date(field.value), 'yyyy-MM-dd\'T\'HH:mm') : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val ? new Date(val).toISOString() : '');
                }}
              />
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
  const { options, isLoading } = useStudioRoomFieldData(show);

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
              onSearch={() => {}}
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
  const { options, isLoading } = useShowTypeFieldData(show);

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
              onSearch={() => {}}
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
  const { options, isLoading } = useShowStatusFieldData(show);

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
              onSearch={() => {}}
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
  const { options, isLoading } = useShowStandardFieldData(show);

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
              onSearch={() => {}}
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

// MCs Field (with isolated network hook)
export const ShowMcsField = memo(({
  control,
  show,
}: {
  control: Control<UpdateShowInput>;
  show: Show | null;
}) => {
  const { options, isLoading, setSearch } = useMcsFieldData(show);

  return (
    <FormField
      control={control}
      name="mcs"
      render={({ field }) => (
        <FormItem className="col-span-1 sm:col-span-2">
          <FormLabel>MCs</FormLabel>
          <FormControl>
            <AsyncMultiCombobox
              value={field.value?.map((v: any) => v.mc_id) || []}
              onChange={(ids) => {
                // Preserve existing metadata if ID exists, else create new
                const currentMcs = field.value || [];
                const newMcs = ids.map((id) => {
                  const existing = currentMcs.find((m: any) => m.mc_id === id);
                  return existing || { mc_id: id };
                });
                field.onChange(newMcs);
              }}
              onSearch={setSearch}
              options={options}
              isLoading={isLoading}
              placeholder="Select MCs"
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
              value={field.value?.map((v: any) => v.platform_id) || []}
              onChange={(ids) => {
                const currentPlatforms = field.value || [];
                const newPlatforms = ids.map((id) => {
                  const existing = currentPlatforms.find((p: any) => p.platform_id === id);
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
