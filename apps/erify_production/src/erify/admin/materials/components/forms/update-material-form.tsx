import type { z } from "zod";

import { useUpdateMaterial } from "@/erify/admin/materials/hooks/use-update-material";
import { type Material, MaterialSchema } from "@/erify/types";
import { Button } from "@eridu/ui/components/button";
import { Checkbox } from "@eridu/ui/components/checkbox";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@eridu/ui/components/select";
import { useToast } from "@eridu/ui/hooks/use-toast";
import { cn } from "@eridu/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useForm } from "react-hook-form";

const formSchema = MaterialSchema.pick({
  id: true,
  name: true,
  type: true,
  description: true,
  resource_url: true,
  client_id: true,
  is_active: true,
});

export type FormSchema = z.infer<typeof formSchema>;

type UpdateMaterialFormProps = {
  material: Material;
  cancel?: () => void | Promise<void>;
} & React.ComponentProps<"form">;

export const UpdateMaterialForm: React.FC<UpdateMaterialFormProps> = ({ material, className, cancel, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: material.id,
      name: material.name,
      type: material.type,
      resource_url: material.resource_url,
      description: material.description ?? "",
      client_id: material.client_id ?? "",
      is_active: material.is_active ?? false,
    },
  });
  const { isPending, mutateAsync } = useUpdateMaterial({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erify_materials"] });
      toast({
        title: "Material updated",
        description: `Material ${material.name} is updated.`,
      });
      cancel?.();
    },
  });

  const submit = useCallback(async (data: FormSchema) => {
    await mutateAsync(data);
  }, [mutateAsync]);

  const onCheckboxChange = useCallback((cb: (checked: boolean) => void) =>
    (checked: boolean) => {
      cb(checked);
    }, []);

  return (
    <Form {...form}>
      <form
        {...props}
        className={cn("flex flex-col gap-2", className)}
        onSubmit={form.handleSubmit(submit)}
      >
        <FormField
          {...form.register("id")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="id">ID</FormLabel>
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
          {...form.register("type")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="type">Type</FormLabel>
              <FormControl>
                <Select
                  disabled={isPending}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="script">Script</SelectItem>
                    <SelectItem value="scene">Scene</SelectItem>
                    <SelectItem value="mechanic">Mechanic</SelectItem>
                    <SelectItem value="obs_layer">OBS Layer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("is_active")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Is Active?</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    id="is_active"
                    name="is_active"
                    checked={field.value ?? false}
                    onCheckedChange={onCheckboxChange(field.onChange)}
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal" htmlFor="is_active">Activate the material</FormLabel>
              </div>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("description")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="description">Description</FormLabel>
              <FormControl>
                <Input type="text" disabled={isPending} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("resource_url")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="resource_url">Resource URL</FormLabel>
              <FormControl>
                <Input type="text" disabled={isPending} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormDescription />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          {...form.register("client_id")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="client_id">Client ID</FormLabel>
              <FormControl>
                <Input type="text" disabled={isPending} {...field} value={field.value ?? ""} />
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
          <Button disabled={isPending}>Confirm</Button>
        </div>
      </form>
    </Form>
  );
};
