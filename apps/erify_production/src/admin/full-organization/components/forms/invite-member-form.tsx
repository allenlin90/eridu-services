import { useFullOrganization } from "@/admin/full-organization/hooks/use-full-organization";
import { useInviteMember } from "@/admin/full-organization/hooks/use-invite-member";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@eridu/ui/components/select";
import { useToast } from "@eridu/ui/hooks/use-toast";
import { cn } from "@eridu/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  email: z.string().email(),
  organizationId: z.string(),
  teamId: z.string(),
  role: z.enum(["admin", "member"]),
});

export type FormSchema = z.infer<typeof formSchema>;

type InviteMemberFormProps = {
  submit?: () => void | Promise<void>;
} & React.ComponentProps<"form">;

export const InviteMemberForm: React.FC<InviteMemberFormProps> = ({ className, submit, ...props }) => {
  const { organization } = useFullOrganization();
  const { mutateAsync, isPending } = useInviteMember();
  const { toast } = useToast();

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      organizationId: organization.id,
      teamId: organization.teams[0]?.id ?? "",
      role: "member",
    },
    disabled: isPending,
  });

  const onSubmit = useCallback(async ({ email, organizationId, teamId, role }: FormSchema) => {
    const data = await mutateAsync({
      email,
      organizationId,
      teamId,
      role,
      resend: true,
    });

    if (data) {
      await submit?.();

      toast({
        variant: "success",
        description: `invitation is sent to ${email}`,
      });
    }
  }, [mutateAsync, submit, toast]);

  return (
    <Form {...form}>
      <form
        className={cn(className)}
        {...props}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          {...form.register("email")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="email">Email</FormLabel>
              <FormControl>
                <Input id="email" type="email" {...field} />
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("organizationId")}
          disabled
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="organization_id">Organization ID</FormLabel>
              <FormControl>
                <Input id="organization_id" type="text" disabled {...field} />
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("teamId")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team ID</FormLabel>
              <FormControl>
                <Select disabled={isPending} onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Teams</SelectLabel>
                      {organization.teams.map(team => (
                        <SelectItem
                          key={team.id}
                          value={team.id}
                        >
                          {team.name}
                        </SelectItem>
                      ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
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
              <FormLabel>Roles</FormLabel>
              <FormControl>
                <Select disabled={isPending} onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Roles</SelectLabel>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
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
          <Button disabled={isPending}>Create</Button>
        </div>
      </form>
    </Form>
  );
};
