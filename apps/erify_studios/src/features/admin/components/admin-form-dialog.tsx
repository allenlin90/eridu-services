import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@eridu/ui';

type AdminFormDialogProps<T extends z.ZodObject<any>> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: T;
  defaultValues?: Partial<z.infer<T>>;
  onSubmit: (data: z.infer<T>) => Promise<void> | void;
  isLoading?: boolean;
  fields?: Array<{
    name: keyof z.infer<T>;
    label: string;
    placeholder?: string;
    type?: 'text' | 'textarea' | 'number' | 'email';
    render?: (field: any) => ReactNode;
  }>;
  children?: ReactNode | ((form: UseFormReturn<z.infer<T>>) => ReactNode);
};

export function AdminFormDialog<T extends z.ZodObject<any>>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  isLoading = false,
  fields,
  children,
}: AdminFormDialogProps<T>) {
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaultValues as any,
  });

  // Reset form when dialog opens/closes or defaultValues change
  useEffect(() => {
    if (open) {
      form.reset(defaultValues as any);
    } else {
      form.reset();
    }
  }, [open, defaultValues, form]);

  const handleSubmit = async (data: z.infer<T>) => {
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done by the mutation
      console.error('Form submission error:', error);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {children
              ? (
                  typeof children === 'function' ? children(form) : children
                )
              : fields?.map((field) => (
                <FormField
                  key={String(field.name)}
                  control={form.control}
                  name={field.name as any}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>{field.label}</FormLabel>
                      <FormControl>
                        {field.render
                          ? (
                              field.render(formField)
                            )
                          : field.type === 'textarea'
                            ? (
                                <Textarea
                                  {...formField}
                                  placeholder={field.placeholder}
                                  disabled={isLoading}
                                  rows={6}
                                  value={(formField.value as string) ?? ''}
                                />
                              )
                            : (
                                <Input
                                  {...formField}
                                  type={field.type || 'text'}
                                  placeholder={field.placeholder}
                                  disabled={isLoading}
                                  value={(formField.value as string) ?? ''}
                                />
                              )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
