import type { Organization } from "@/admin/full-organization/types";

import { useUpdateTeam } from "@/admin/full-organization/hooks/use-update-team";
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

type EditTeamFormProps = {
  submit?: () => void | Promise<void>;
  team: Organization["teams"][0];
} & React.ComponentProps<"form">;

export const EditTeamForm: React.FC<EditTeamFormProps> = ({ className, submit, team, ...props }) => {
  const { mutateAsync, isPending } = useUpdateTeam();
  const { toast } = useToast();

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: team.name,
    },
    disabled: isPending,
  });

  const onSubmit = useCallback(async ({ name }: FormSchema) => {
    if (name && name !== team.name) {
      await mutateAsync({ teamId: team.id, data: { name } });
    }
    await submit?.();

    toast({
      variant: "success",
      description: `Team ${name} is updated`,
    });
  }, [mutateAsync, submit, team, toast]);

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
      </form>
    </Form>
  );
};

export default EditTeamForm;
