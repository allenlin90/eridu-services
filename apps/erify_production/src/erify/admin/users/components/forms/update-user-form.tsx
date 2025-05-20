import type { User } from "@/erify/types";

import { useUpdateUser } from "@/erify/admin/users/hooks/use-update-user";
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
import { z } from "zod";

const formSchema = z.object({
  uid: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
  ext_uid: z.string().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

type UpdateUserFormProps = {
  user: User;
  cancel?: () => void;
} & React.ComponentProps<"form">;

export const UpdateUserForm: React.FC<UpdateUserFormProps> = ({
  user,
  cancel,
  className,
  ...props
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useUpdateUser({
    onSuccess: ({ name }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        variant: "success",
        description: `User ${name} is updated`,
      });
      cancel?.();
    },
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      uid: user.uid ?? "",
      name: user.name ?? "",
      email: user.email ?? "",
      ext_uid: user.ext_uid ?? "",
    },
  });

  const onSubmit = useCallback(async (values: FormSchema) => {
    await mutateAsync(values);
  }, [mutateAsync]);

  return (
    <Form {...form}>
      <form
        {...props}
        className={cn(className)}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          {...form.register("uid")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID</FormLabel>
              <FormControl>
                <Input {...field} readOnly disabled={isPending} />
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
          {...form.register("email")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("ext_uid")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alias ID</FormLabel>
              <FormControl>
                <Input {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 mt-4">
          {cancel && (
            <Button
              type="button"
              variant="outline"
              onClick={cancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            Update
          </Button>
        </div>
      </form>
    </Form>
  );
};
