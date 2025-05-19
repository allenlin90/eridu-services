import type { Brand } from "@/erify/types";

import { useUpdateBrand } from "@/erify/admin/brands/hooks/use-update-brand";
import { Button } from "@eridu/ui/components/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@eridu/ui/components/form";
import { Input } from "@eridu/ui/components/input";
import { useToast } from "@eridu/ui/hooks/use-toast";
import { cn } from "@eridu/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  uid: z.string().min(1),
  name: z.string().min(1),
});

export type FormSchema = z.infer<typeof formSchema>;

type UpdateBrandFormProps = {
  brand: Brand;
  cancel?: () => void | Promise<void>;
} & React.ComponentProps<"form">;

export const UpdateBrandForm: React.FC<UpdateBrandFormProps> = ({ brand, className, cancel, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      uid: brand.uid,
      name: "",
    },
  });
  const { isPending, mutateAsync } = useUpdateBrand({
    onSuccess: ({ name }) => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast({
        variant: "success",
        description: `Brand ${name} is updated`,
      });
      cancel?.();
    },
  });

  const submit = useCallback(async ({ uid, name }: FormSchema) => {
    await mutateAsync({ uid, name });
  }, [mutateAsync]);

  return (
    <Form {...form}>
      <form
        {...props}
        className={cn("flex flex-col gap-2", className)}
        onSubmit={form.handleSubmit(submit)}
      >
        <FormField
          {...form.register("uid")}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="uid">ID</FormLabel>
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
