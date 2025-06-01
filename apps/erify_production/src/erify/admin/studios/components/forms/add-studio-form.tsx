import type { z } from "zod";

import { useAddStudio } from "@/erify/admin/studios/hooks/use-add-studio";
import { StudioSchema } from "@/erify/types";
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

const formSchema = StudioSchema.pick({
  name: true,
  address_id: true,
});

export type FormSchema = z.infer<typeof formSchema>;

type AddStudioFormProps = {
  cancel?: () => void | Promise<void>;
} & React.ComponentProps<"form">;

export const AddStudioForm: React.FC<AddStudioFormProps> = ({ className, cancel, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useAddStudio({
    onSuccess: ({ name }) => {
      toast({
        variant: "success",
        description: `Studio ${name} is created`,
      });
      cancel?.();
      queryClient.invalidateQueries({ queryKey: ["studios"] });
    },
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address_id: "",
    },
  });

  const onSubmit = useCallback(
    async ({ name, address_id }: FormSchema) => {
      await mutateAsync({ name, address_id });
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
          {...form.register("address_id")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="address_id">Address ID</FormLabel>
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
