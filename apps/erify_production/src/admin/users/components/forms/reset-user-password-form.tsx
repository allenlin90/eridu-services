import type { UserWithRole } from "@eridu/auth-service/types";

import { useResetUserPassword } from "@/admin/users/hooks/use-reset-user-password";
import { useSession } from "@eridu/auth-service/hooks/use-session";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@eridu/ui/components/form";
import { PasswordInput } from "@eridu/ui/components/password-input";
import { useToast } from "@eridu/ui/hooks/use-toast";
import { cn } from "@eridu/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useRowActionStore } from "../../stores/use-row-action-store";

const formSchema = z.object({
  password: z.string().min(6),
});

type FormSchema = z.infer<typeof formSchema>;

type ResetUserPasswordFormProps = {
  user: UserWithRole;
} & React.ComponentProps<"form">;

export const ResetUserPasswordForm: React.FC< ResetUserPasswordFormProps> = ({ className, user, ...props }) => {
  const closeDialog = useRowActionStore(state => state.closeDialog);
  const { toast } = useToast();
  const { session } = useSession();
  const { isPending, mutateAsync } = useResetUserPassword();

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
    },
  });

  const submit = useCallback(
    async ({ password: newPassword }: FormSchema) => {
      if (!user || isPending)
        return;

      if (session?.id === user.id) {
        toast({
          variant: "destructive",
          description: "You cannot reset your password here!",
        });
        return;
      }

      await mutateAsync({ userId: user?.id, newPassword });

      toast({
        description: `Password of user: ${user?.name} is reset`,
      });

      closeDialog();
    },
    [closeDialog, isPending, mutateAsync, user, session, toast],
  );

  return (
    <Form {...form}>
      <form className={cn(className)} {...props} onSubmit={form.handleSubmit(submit)}>
        <FormField
          {...form.register("password")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="password">Password</FormLabel>
              <FormControl>
                <PasswordInput {...field} />
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
