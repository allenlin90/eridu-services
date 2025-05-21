import { useUpdateStudioRoom } from "@/erify/admin/studio-rooms/hooks/use-update-studio-room";
import { type StudioRoom, StudioRoomSchema } from "@/erify/types";
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
import { z } from "zod";

const formSchema = StudioRoomSchema.pick({
  uid: true,
  name: true,
  type: true,
  studio_uid: true,
}).extend({
  name: z.string().min(1, "studio UID is required"),
  studio_uid: z.string().min(1, "studio UID is required"),
});

export type FormSchema = z.infer<typeof formSchema>;

type UpdateStudioRoomFormProps = {
  studioRoom: StudioRoom;
  cancel?: () => void | Promise<void>;
} & React.ComponentProps<"form">;

export const UpdateStudioRoomForm: React.FC<UpdateStudioRoomFormProps> = ({
  studioRoom,
  cancel,
  className,
  ...props
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useUpdateStudioRoom({
    onSuccess: ({ name }) => {
      toast({
        variant: "success",
        description: `Studio Room ${name} has been updated.`,
      });
      cancel?.();
      queryClient.invalidateQueries({ queryKey: ["studio_rooms"] });
    },
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      uid: studioRoom.uid,
      name: studioRoom.name,
      type: studioRoom.type,
      studio_uid: studioRoom.studio_uid,
    },
  });

  const submit = useCallback(
    async (values: FormSchema) => {
      await mutateAsync(values);
    },
    [mutateAsync],
  );

  return (
    <Form {...form}>
      <form
        className={cn("flex flex-col gap-2", className)}
        {...props}
        onSubmit={form.handleSubmit(submit)}
      >
        <FormField
          {...form.register("uid")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="uid">UID</FormLabel>
              <FormControl>
                <Input type="text" disabled={isPending} readOnly {...field} />
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
          {...form.register("studio_uid")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="studio_uid">Studio UID</FormLabel>
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
            Update
          </Button>
        </div>
      </form>
    </Form>
  );
};
