import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { updateShowInputSchema } from '@eridu/api-types/shows';
import { Button, DialogFooter, Form } from '@eridu/ui';

import {
  ShowClientField,
  ShowMcsField,
  ShowNameField,
  ShowPlatformsField,
  ShowStandardField,
  ShowStatusField,
  ShowStudioRoomField,
  ShowTimeFields,
  ShowTypeField,
} from './show-form-fields';

import type { Show } from '@/features/shows/api/get-shows';
import { useUpdateShow } from '@/features/shows/api/update-show';

type ShowUpdateFormProps = {
  show: Show | null;
  onCancel: () => void;
  onSubmit?: (data: z.infer<typeof updateShowInputSchema>) => void;
  isLoading?: boolean;
};

export function ShowUpdateForm({
  show,
  onCancel,
  onSubmit: propsOnSubmit,
  isLoading: propsIsLoading,
}: ShowUpdateFormProps) {
  const internalUpdateMutation = useUpdateShow();
  const isLoading = propsIsLoading || internalUpdateMutation.isPending;

  const form = useForm<z.infer<typeof updateShowInputSchema>>({
    resolver: zodResolver(updateShowInputSchema),
    defaultValues: {
      name: '',
      start_time: '',
      end_time: '',
      mcs: [],
      platforms: [],
    },
  });

  // Reset form when show changes
  useEffect(() => {
    if (show) {
      form.reset({
        name: show.name,
        start_time: show.start_time,
        end_time: show.end_time,
        client_id: show.client_id || undefined,
        studio_room_id: show.studio_room_id || undefined,
        show_type_id: show.show_type_id || undefined,
        show_status_id: show.show_status_id || undefined,
        show_standard_id: show.show_standard_id || undefined,
        mcs: show.mcs?.map((mc: any) => ({
          mc_id: mc.mc_id || mc.id || '',
          note: mc.note,
          metadata: mc.metadata,
        })) || [],
        platforms: show.platforms?.map((p: any) => ({
          platform_id: p.platform_id || p.id || '',
          live_stream_link: p.live_stream_link,
          platform_show_id: p.platform_show_id,
          viewer_count: p.viewer_count,
          metadata: p.metadata,
        })) || [],
      });
    }
  }, [show, form]);

  const handleSubmit = useCallback((data: z.infer<typeof updateShowInputSchema>) => {
    if (!show)
      return;

    if (propsOnSubmit) {
      propsOnSubmit(data);
    } else {
      internalUpdateMutation.mutate(
        { id: show.id, data },
        {
          onSuccess: () => {
            onCancel();
          },
        },
      );
    }
  }, [show, propsOnSubmit, internalUpdateMutation, onCancel]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ShowNameField control={form.control} />

          <ShowTimeFields control={form.control} />

          <ShowClientField control={form.control} show={show} />

          <ShowStudioRoomField control={form.control} show={show} />

          <ShowTypeField control={form.control} show={show} />

          <ShowStatusField control={form.control} show={show} />

          <ShowStandardField control={form.control} show={show} />

          <ShowMcsField control={form.control} show={show} />

          <ShowPlatformsField control={form.control} show={show} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
