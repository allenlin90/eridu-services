import type { z } from "zod";

import { useAddShow } from "@/erify/admin/shows/hooks/use-add-show";
import { ShowSchema } from "@/erify/types";
import { Button } from "@eridu/ui/components/button";
import {
  Form,
  FormControl,
  FormDescription,
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
  name: true,
  client_id: true,
  start_time: true,
  end_time: true,
  studio_room_id: true,
});

export type FormSchema = z.infer<typeof formSchema>;

type AddShowFormProps = {
  cancel?: () => void | Promise<void>;
} & React.ComponentProps<"form">;

export const AddShowForm: React.FC<AddShowFormProps> = ({ className, cancel, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPending, mutateAsync } = useAddShow({
    onSuccess: (show) => {
      queryClient.invalidateQueries({ queryKey: ["erify_shows"] });
      toast({
        variant: "success",
        description: `Show ${show?.name || ""} is created`,
      });
      cancel?.();
    },
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      client_id: "",
      start_time: "",
      end_time: "",
      studio_room_id: "",
    },
  });

  const submit = useCallback(async (values: FormSchema) => {
    await mutateAsync(values);
  }, [mutateAsync]);

  return (
    <Form {...form}>
      <form
        {...props}
        className={cn("flex flex-col gap-2", className)}
        onSubmit={form.handleSubmit(submit)}
      >
        <FormField
          {...form.register("name")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input type="text" disabled={isPending} {...field} />
              </FormControl>
              <FormDescription />
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
                <Input type="text" disabled={isPending} {...field} />
              </FormControl>
              <FormDescription />
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
                <Input type="datetime-local" disabled={isPending} {...field} />
              </FormControl>
              <FormDescription />
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
                <Input
                  {...field}
                  type="datetime-local"
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription />
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
                <Input type="text" disabled={isPending} {...field} />
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="w-full flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={cancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button disabled={isPending}>Add</Button>
        </div>
      </form>
    </Form>
  );
};
