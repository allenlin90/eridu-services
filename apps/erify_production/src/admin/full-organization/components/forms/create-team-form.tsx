import { useCreateTeam } from "@/admin/full-organization/hooks/use-create-team";
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
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Team name is required"),
});

type FormSchema = z.infer<typeof formSchema>;

type CreateTeamFormProps = {
  submit?: () => void | Promise<void>;
} & React.ComponentProps<"form">;

export const CreateTeamForm: React.FC<CreateTeamFormProps> = ({ className, submit, ...props }) => {
  const { mutateAsync, isPending } = useCreateTeam();
  const { toast } = useToast();

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
    disabled: isPending,
  });

  const onSubmit = useCallback(async ({ name }: FormSchema) => {
    await mutateAsync({ name });
    await submit?.();

    toast({
      variant: "success",
      description: `Team ${name} is created`,
    });
  }, [mutateAsync, submit, toast]);

  return (
    <Form {...form}>
      <form
        className={cn(className)}
        {...props}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          {...form.register("name")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="team_name">Team Name</FormLabel>
              <FormControl>
                <Input id="team_name" type="text" {...field} />
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="w-full flex justify-end">
          <Button disabled={isPending}>Create</Button>
        </div>
      </form>
    </Form>
  );
};

export default CreateTeamForm;
