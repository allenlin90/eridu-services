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
import { cn } from "@eridu/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z
  .object({
    email: z.string().email(),
  });

type FormSchema = z.infer<typeof formSchema>;

type ForgetPasswordFormProps = Omit<React.ComponentProps<"form">, "onSubmit"> & {
  disabled?: boolean;
  onSubmit: SubmitHandler<FormSchema>;
};

// TODO: migrate this for auth service
export const ForgetPasswordForm: React.FC<ForgetPasswordFormProps>
= ({
  onSubmit,
  className,
  disabled = false,
  ...props
}) => {
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  return (
    <Form {...form}>
      <form
        {...props}
        aria-disabled={disabled}
        className={cn(className, "flex flex-col gap-2")}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          {...form.register("email", {
            min: 6,
            required: true,
          })}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="email">Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={disabled}
                  type="email"
                  name="email"
                  placeholder="email"
                />
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="w-full flex justify-end">
          <Button type="submit" disabled={disabled}>Send</Button>
        </div>
      </form>
    </Form>
  );
};
