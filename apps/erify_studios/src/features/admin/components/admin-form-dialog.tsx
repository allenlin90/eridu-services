import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type {
  ControllerRenderProps,
  DefaultValues,
  FieldValues,
  Path,
  Resolver,
  UseFormReturn,
} from 'react-hook-form';
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

type FormValues<T extends z.ZodObject<z.ZodRawShape>> = z.infer<T> & FieldValues;

type AdminFormField<TValues extends FieldValues> = {
  kind?: 'field';
  name: Path<TValues>;
  label: string;
  placeholder?: string;
  type?: 'text' | 'textarea' | 'number' | 'email';
  render?: (field: ControllerRenderProps<TValues, Path<TValues>>) => ReactNode;
};

type AdminRenderField<TValues extends FieldValues> = {
  kind: 'render';
  id: string;
  label: string;
  render: (form: UseFormReturn<TValues>) => ReactNode;
};

type AdminDialogField<TValues extends FieldValues> =
  | AdminFormField<TValues>
  | AdminRenderField<TValues>;

type AdminFormDialogProps<T extends z.ZodObject<z.ZodRawShape>> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: T;
  defaultValues?: DefaultValues<FormValues<T>>;
  onSubmit: (data: FormValues<T>) => Promise<void> | void;
  isLoading?: boolean;
  fields?: Array<AdminDialogField<FormValues<T>>>;
  children?: ReactNode | ((form: UseFormReturn<FormValues<T>>) => ReactNode);
};

export function AdminFormDialog<T extends z.ZodObject<z.ZodRawShape>>({
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
  const form = useForm<FormValues<T>>({
    resolver: zodResolver(schema) as Resolver<FormValues<T>>,
    defaultValues,
  });

  // Reset form when dialog opens/closes or defaultValues change
  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    } else {
      form.reset();
    }
  }, [open, defaultValues, form]);

  const handleSubmit = async (data: FormValues<T>) => {
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch {
      // Mutation-level handlers own user-facing errors; keep the dialog open.
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
                field.kind === 'render'
                  ? (
                      <FormItem key={field.id}>
                        <FormLabel>{field.label}</FormLabel>
                        <FormControl>{field.render(form)}</FormControl>
                      </FormItem>
                    )
                  : (
                      <FormField
                        key={field.name}
                        control={form.control}
                        name={field.name}
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
                    )
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
