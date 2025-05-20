import type { z } from "zod";

import { useAddUser } from "@/erify/admin/users/hooks/use-add-user";
import { UserSchema } from "@/erify/types";
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

const formSchema = UserSchema.pick({
  name: true,
  email: true,
  ext_uid: true,
});

export type FormSchema = z.infer<typeof formSchema>;

type AddUserFormProps = {
  cancel?: () => void | Promise<void>;
} & React.ComponentProps<"form">;

export const AddUserForm: React.FC<AddUserFormProps> = ({ className, cancel, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPending, mutateAsync } = useAddUser({
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["erify_users"] });
      toast({
        variant: "success",
        description: `User ${user?.name || ""} is created`,
      });
      cancel?.();
    },
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
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
          {...form.register("email")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="email">Email</FormLabel>
              <FormControl>
                <Input type="email" disabled={isPending} {...field} />
              </FormControl>
              <FormDescription />
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
                <Input type="text" disabled={isPending} {...field} />
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("ext_uid")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>External ID</FormLabel>
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
