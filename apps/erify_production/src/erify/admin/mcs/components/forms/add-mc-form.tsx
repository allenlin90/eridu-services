import type { z, ZodIssue } from "zod";

import { useAddMc } from "@/erify/admin/mcs/hooks/use-add-mc";
import { McSchema } from "@/erify/types";
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
import { HttpStatusCode } from "axios";
import { useCallback } from "react";
import { useForm } from "react-hook-form";

const formSchema = McSchema.pick({ name: true, user_uid: true });

export type FormSchema = z.infer<typeof formSchema>;

type AddMcFormProps = {
  cancel?: () => void | Promise<void>;
} & React.ComponentProps<"form">;

export const AddMcForm: React.FC<AddMcFormProps> = ({ cancel, className, ...props }) => {
  const { toast } = useToast();
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      user_uid: "",
    },
  });
  const { isPending, mutateAsync } = useAddMc({
    onSuccess: (mc) => {
      toast({
        variant: "success",
        description: `MC ${mc.name} is created`,
      });
      cancel?.();
    },
    onError: (error) => {
      if (error.status === HttpStatusCode.UnprocessableEntity) {
        error.response?.data.error.issues.forEach((issue: ZodIssue) => {
          const [formField] = issue.path;

          if (formField) {
            form.setError(
              formField as keyof FormSchema,
              { type: "server", message: issue.message },
            );
          }
        });
        return;
      }

      if (error.status === HttpStatusCode.Conflict) {
        form.setError(
          "user_uid",
          { type: "pattern", message: error.response?.data.message },
        );
        return;
      }

      toast({
        variant: "destructive",
        description: error.message || "something went wrong",
      });
    },
  });

  const submit = useCallback(async ({ name, user_uid }: FormSchema) => {
    await mutateAsync({ name, user_uid });
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
              <FormLabel htmlFor="name">User ID</FormLabel>
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
          >
            Cancel
          </Button>
          <Button>Confirm</Button>
        </div>
      </form>
    </Form>
  );
};
