import type { MC } from "@/erify/types";

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
import { useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useUpdateMc } from "../../hooks/use-update-mc";

const formSchema = z.object({
  uid: z.string().min(1),
  name: z.string().min(1),
  user_uid: z.string().optional(),
});

export type FormSchema = z.infer<typeof formSchema>;

type UpdateMcFormProps = {
  mc: MC;
  cancel?: () => void | Promise<void>;
} & React.ComponentProps<"form">;

export const UpdateMcForm: React.FC<UpdateMcFormProps> = ({ mc, className, cancel, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      uid: mc.uid,
      name: mc.name,
      user_uid: mc.user_uid ?? "",
    },
  });

  const userUidValue = form.watch("user_uid");
  const initialUserUid = useRef(mc.user_uid ?? "");

  const { isPending, mutateAsync } = useUpdateMc({
    onSuccess: ({ name }) => {
      queryClient.invalidateQueries({ queryKey: ["mcs"] });
      toast({
        variant: "success",
        description: `MC ${name} is updated`,
      });
      cancel?.();
    },
  });

  const submit = useCallback(async ({ uid, name, user_uid }: FormSchema) => {
    await mutateAsync({ uid, name, user_uid });
  }, [mutateAsync]);

  return (
    <Form {...form}>
      <form
        {...props}
        className={cn("flex flex-col gap-2", className)}
        onSubmit={form.handleSubmit(submit)}
      >
        <FormField
          {...form.register("uid")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="uid">ID</FormLabel>
              <FormControl>
                <Input type="text" readOnly {...field} />
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
              <FormLabel htmlFor="name">Name</FormLabel>
              <FormControl>
                <Input type="text" disabled={isPending} {...field} />
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("user_uid")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="user_uid">User ID</FormLabel>
              <FormControl>
                <Input type="text" disabled={isPending} {...field} />
              </FormControl>
              {initialUserUid.current && !userUidValue && (
                <div className="text-yellow-600 text-xs mt-1">
                  Warning: Removing the User ID will set this property to empty
                </div>
              )}
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
          >
            Cancel
          </Button>
          <Button>Confirm</Button>
        </div>
      </form>
    </Form>
  );
};
