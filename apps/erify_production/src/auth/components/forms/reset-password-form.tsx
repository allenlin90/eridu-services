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
import { PasswordInput } from "@eridu/ui/components/password-input";
import { cn } from "@eridu/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z
  .object({
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  });

type FormSchema = z.infer<typeof formSchema>;

type ResetPasswordFormProps = Omit<React.ComponentProps<"form">, "onSubmit"> & {
  onSubmit: SubmitHandler<FormSchema>;
};

export const ResetPasswordForm: React.FC<ResetPasswordFormProps>
= ({
  onSubmit,
  className,
  ...props
}) => {
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const submit: SubmitHandler<FormSchema>
  = useCallback(({ password, confirmPassword }) => {
    if (password !== confirmPassword) {
      form.setError("password", {
        type: "custom",
        message: "passwords are not the same!",
      });
      form.setError("confirmPassword", {
        type: "custom",
        message: "passwords are not the same!",
      });
      return;
    }

    onSubmit({ password, confirmPassword });
  }, [form, onSubmit]);

  return (
    <Form {...form}>
      <form
        {...props}
        className={cn(className, "flex flex-col gap-2")}
        onSubmit={form.handleSubmit(submit)}
      >
        <FormField
          {...form.register("password", {
            min: 6,
            required: true,
          })}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="password">Password</FormLabel>
              <FormControl>
                <PasswordInput
                  {...field}
                  name="password"
                  placeholder="password"
                />
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("confirmPassword", {
            min: 6,
            required: true,
          })}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="confirm_password">Confirm Password</FormLabel>
              <FormControl>
                <PasswordInput
                  {...field}
                  name="confirm_password"
                  placeholder="confirm password"
                />
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="w-full flex justify-end">
          <Button type="submit">Confirm</Button>
        </div>
      </form>
    </Form>
  );
};
