import type { Platform } from "@/erify/types";

import { useUpdatePlatform } from "@/erify/admin/platforms/hooks/use-update-platform";
import { Button } from "@eridu/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@eridu/ui/components/form";
import { Input } from "@eridu/ui/components/input";
import { useToast } from "@eridu/ui/hooks/use-toast";
import { cn } from "@eridu/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type FormSchema = z.infer<typeof formSchema>;

type UpdatePlatformFormProps = {
  platform: Platform;
  cancel?: () => void | Promise<void>;
} & React.ComponentProps<"form">;

export const UpdatePlatformForm: React.FC<UpdatePlatformFormProps> = ({ platform, cancel, className, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useUpdatePlatform({
    onSuccess: ({ name }) => {
      toast({
        variant: "success",
        description: `Platform ${name} has been updated.`,
      });
      cancel?.();
      queryClient.invalidateQueries({ queryKey: ["platforms"] });
    },
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: platform.name,
    },
  });

  const onSubmit = useCallback(
    async ({ name }: FormSchema) => {
      await mutateAsync({ id: platform.id, name });
    },
    [mutateAsync, platform.id],
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
