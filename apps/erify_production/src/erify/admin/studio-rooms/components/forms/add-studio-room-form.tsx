import type { z } from "zod";

import { useAddStudioRoom } from "@/erify/admin/studio-rooms/hooks/use-add-studio-room";
import { StudioRoomSchema } from "@/erify/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@eridu/ui/components/select";
import { useToast } from "@eridu/ui/hooks/use-toast";
import { cn } from "@eridu/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useForm } from "react-hook-form";

const formSchema = StudioRoomSchema.pick({
  name: true,
  type: true,
  studio_id: true,
});

export type FormSchema = z.infer<typeof formSchema>;

type AddStudioRoomFormProps = {
  cancel?: () => void | Promise<void>;
} & React.ComponentProps<"form">;

export const AddStudioRoomForm: React.FC<AddStudioRoomFormProps> = ({ className, cancel, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useAddStudioRoom({
    onSuccess: ({ name }) => {
      toast({
        variant: "success",
        description: `Studio Room ${name} is created`,
      });
      cancel?.();
      queryClient.invalidateQueries({ queryKey: ["studio_rooms"] });
    },
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "m",
      studio_id: "",
    },
  });

  const onSubmit = useCallback(
    async ({ name, type, studio_id }: FormSchema) => {
      await mutateAsync({ name, type, studio_id });
    },
    [mutateAsync],
  );

  return (
    <Form {...form}>
      <form
        className={cn("flex flex-col gap-2", className)}
        {...props}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          {...form.register("name")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="name">Name</FormLabel>
              <FormControl>
                <Input type="text" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("type")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="type">Type</FormLabel>
              <FormControl>
                <Select
                  disabled={isPending}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="s">Size S</SelectItem>
                    <SelectItem value="m">Size M</SelectItem>
                    <SelectItem value="l">Size L</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("studio_id")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="studio_id">Studio ID</FormLabel>
              <FormControl>
                <Input type="text" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={cancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            Add
          </Button>
        </div>
      </form>
    </Form>
  );
};
