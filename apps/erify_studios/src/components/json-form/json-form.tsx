import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import type { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { useForm } from 'react-hook-form';

import {
  Checkbox,
  DatePicker,
  DateTimePicker,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import type { UiSchema } from '@/lib/zod-schema-builder';
import { zodSchemaBuilder } from '@/lib/zod-schema-builder';

type JsonFormProps = {
  schema: UiSchema;
  values?: Record<string, unknown>;
  onChange?: (values: Record<string, unknown>) => void;
  onSubmit?: (values: Record<string, unknown>) => void;
  readOnly?: boolean;
};

const DEFAULT_VALUES: Record<string, unknown> = {};

export function JsonForm({
  schema,
  values = DEFAULT_VALUES,
  onChange,
  onSubmit,
  readOnly = false,
}: JsonFormProps) {
  const zodSchema = zodSchemaBuilder.buildTaskContentSchema(schema);

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(zodSchema),
    defaultValues: values,
    mode: 'onChange',
  });

  // Sync form values when prop values change
  useEffect(() => {
    if (values) {
      form.reset(values);
    }
  }, [values, form]);

  // Watch for changes and call onChange
  useEffect(() => {
    if (onChange) {
      const subscription = form.watch((value) => {
        onChange(value as Record<string, unknown>);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, onChange]);

  const handleSubmit = (data: Record<string, unknown>) => {
    if (onSubmit) {
      onSubmit(data);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
      >
        {schema.items.map((item) => (
          <FormField
            key={item.key}
            control={form.control}
            name={item.key}
            render={({ field }) => (
              <FormItem className={item.type === 'checkbox' ? 'flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm' : ''}>
                {item.type === 'checkbox'
                  ? (
                      <>
                        <FormControl>
                          <Checkbox
                            checked={field.value as boolean}
                            onCheckedChange={field.onChange}
                            disabled={readOnly}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            {item.label}
                            {item.required && <span className="text-destructive ml-1">*</span>}
                          </FormLabel>
                          {item.description && (
                            <FormDescription>
                              {item.description}
                            </FormDescription>
                          )}
                        </div>
                      </>
                    )
                  : (
                      <>
                        <FormLabel>
                          {item.label}
                          {item.required && <span className="text-destructive ml-1">*</span>}
                        </FormLabel>
                        <FormControl>
                          <FieldRenderer
                            item={item}
                            field={field}
                            readOnly={readOnly}
                          />
                        </FormControl>
                        {item.description && (
                          <FormDescription>
                            {item.description}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </>
                    )}
              </FormItem>
            )}
          />
        ))}
      </form>
    </Form>
  );
}

type FieldRendererProps = {
  item: UiSchema['items'][0];
  field: ControllerRenderProps<FieldValues, string>;
  readOnly?: boolean;
};

function FieldRenderer({ item, field, readOnly }: FieldRendererProps) {
  switch (item.type) {
    case 'text':
      return (
        <Input
          {...field}
          placeholder={item.label}
          disabled={readOnly}
          value={(field.value as string) ?? ''}
        />
      );
    case 'textarea':
      return (
        <Textarea
          {...field}
          placeholder={item.label}
          disabled={readOnly}
          value={(field.value as string) ?? ''}
        />
      );
    case 'number':
      return (
        <Input
          {...field}
          type="number"
          placeholder={item.label}
          disabled={readOnly}
          onChange={(e) => {
            const parsed = e.target.value === '' ? null : Number(e.target.value);
            field.onChange(Number.isNaN(parsed) ? null : parsed);
          }}
          value={(field.value as number) ?? ''}
        />
      );
    case 'select':
      return (
        <Select
          onValueChange={field.onChange}
          defaultValue={field.value as string}
          disabled={readOnly}
          value={field.value as string}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${item.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {item.options?.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'multiselect': {
      const selected: string[] = Array.isArray(field.value) ? (field.value as string[]) : [];
      return (
        <div className="space-y-2">
          {item.options?.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(option.value)}
                disabled={readOnly}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...selected, option.value]
                    : selected.filter((v) => v !== option.value);
                  field.onChange(next);
                }}
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      );
    }
    case 'date':
      return (
        <DatePicker
          value={field.value as string}
          onChange={field.onChange}
          className="w-full"
        />
      );
    case 'datetime':
      return (
        <DateTimePicker
          value={field.value as string}
          onChange={field.onChange}
          className="w-full"
        />
      );
    default:
      return (
        <div className="text-muted-foreground italic">
          Unsupported field type:
          {' '}
          {item.type}
        </div>
      );
  }
}
