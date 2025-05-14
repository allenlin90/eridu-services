import { useAddUser } from "@/admin/users/hooks/use-add-user";
import { generateRandomString } from "@/utils";
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
import { PasswordInput } from "@eridu/ui/components/password-input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@eridu/ui/components/select";
import { cn } from "@eridu/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "user"]).optional(),
});

type FormSchema = z.infer<typeof formSchema>;

type AddUserFormProps = {} & React.ComponentProps<"form">;

export const AddUserForm: React.FC<AddUserFormProps> = ({ className, ...props }) => {
  const { mutateAsync, isPending } = useAddUser();
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
    },
  });

  const disabled = isPending;

  const onGeneratePassword = useCallback(() => {
    const password = generateRandomString();
    form.setValue("password", password);
    form.clearErrors("password");
  }, [form]);

  const onSubmit = useCallback(
    ({ name, email, password, role }: FormSchema) => {
      mutateAsync({
        name,
        password,
        email,
        role,
      });
    },
    [mutateAsync],
  );

  return (
    <Form {...form}>
      <form
        {...props}
        className={cn("flex flex-col gap-2", className)}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          {...form.register("email")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="email">Email</FormLabel>
              <FormControl>
                <Input type="email" disabled={disabled} {...field} />
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
                <Input type="text" disabled={disabled} {...field} />
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("password")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <PasswordInput {...field} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onGeneratePassword}
                  >
                    Generate
                  </Button>
                </div>
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("role")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Roles</SelectLabel>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="w-full flex justify-end">
          <Button disabled={disabled}>Create</Button>
        </div>
      </form>
    </Form>
  );
};
