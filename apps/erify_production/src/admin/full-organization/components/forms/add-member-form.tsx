import { useAddMember } from "@/admin/full-organization/hooks/use-add-member";
import { useFullOrganization } from "@/admin/full-organization/hooks/use-full-organization";
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
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  teamId: z.string(),
  role: z.enum(["admin", "member"]),
});

export type FormSchema = z.infer<typeof formSchema>;

type AddMemberFormProps = {
  submit?: () => void | Promise<void>;
} & React.ComponentProps<"form">;

export const AddMemberForm: React.FC<AddMemberFormProps> = ({ className, submit, ...props }) => {
  const { toast } = useToast();
  const { organization } = useFullOrganization();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useAddMember({
    onSuccess: async ({ userId, teamId }) => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });

      await submit?.();

      const team = organization.teams.find(team => team.id === teamId);

      toast({
        variant: "success",
        description: `User: ${userId} is added to team ${team?.name ?? teamId}`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: error.response?.data.error || "something went wrong",
      });
    },
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      organizationId: organization.id,
      teamId: organization.teams[0]?.id ?? "",
      role: "member",
    },
    disabled: isPending,
  });

  const onSubmit = useCallback(async ({ userId, organizationId, teamId, role }: FormSchema) => {
    await mutateAsync({
      userId,
      organizationId,
      teamId,
      role,
    });
  }, [mutateAsync]);

  return (
    <Form {...form}>
      <form
        className={cn(className)}
        {...props}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <p className="text-gray-500 text-sm mb-3">The user membership will be created after confirm</p>
        <FormField
          {...form.register("userId")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="user_id">User ID</FormLabel>
              <FormControl>
                <Input id="user_id" type="text" {...field} />
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("organizationId")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="organization_id">Organization ID</FormLabel>
              <FormControl>
                <Input id="organization_id" type="text" readOnly {...field} />
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
          <Button disabled={isPending}>Confirm</Button>
        </div>
      </form>
    </Form>
  );
};
