import type { z } from "zod";

import { useUpdateShow } from "@/erify/admin/shows/hooks/use-update-show";
import { ShowSchema } from "@/erify/types";
import { formatToDatetimeLocal } from "@/utils";
import { Button } from "@eridu/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@eridu/ui/components/form";
import { Input } from "@eridu/ui/components/input";
import { useToast } from "@eridu/ui/hooks/use-toast";
import { cn } from "@eridu/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useForm } from "react-hook-form";

const formSchema = ShowSchema.pick({
  id: true,
  name: true,
  client_id: true,
  start_time: true,
  end_time: true,
  studio_room_id: true,
});

export type FormSchema = z.infer<typeof formSchema>;

type UpdateShowFormProps = {
  show: FormSchema;
  cancel?: () => void | Promise<void>;
} & React.ComponentProps<"form">;

export const UpdateShowForm: React.FC<UpdateShowFormProps> = ({ show, cancel, className, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useUpdateShow({
    onSuccess: ({ name }) => {
      queryClient.invalidateQueries({ queryKey: ["erify_shows"] });
      toast({
        variant: "success",
        description: `Show ${name} is updated`,
      });
      cancel?.();
    },
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: show.id,
      name: show.name,
      client_id: show.client_id,
      start_time: formatToDatetimeLocal(show.start_time),
      end_time: formatToDatetimeLocal(show.end_time),
      studio_room_id: show.studio_room_id,
    },
  });

  const onSubmit = useCallback(async (values: FormSchema) => {
    await mutateAsync(values);
  }, [mutateAsync]);

  return (
    <Form {...form}>
      <form
        {...props}
        className={cn("flex flex-col gap-2", className)}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          {...form.register("id")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID</FormLabel>
              <FormControl>
                <Input {...field} readOnly disabled />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("name")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("client_id")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client ID</FormLabel>
              <FormControl>
                <Input {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("start_time")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("end_time")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("studio_room_id")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Studio Room ID</FormLabel>
              <FormControl>
                <Input {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={cancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            Update
          </Button>
        </div>
      </form>
    </Form>
  );
};
