import { Eye, File as FileIcon, Upload, X } from 'lucide-react';
import { memo, useState } from 'react';

import {
  Button,
  Checkbox,
  DatePicker,
  DateTimePicker,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import type { FieldItem, TemplateSchemaType } from '../builder/schema';

import { MultiSelect } from './multi-select';
import { shouldShowReason, validateField } from './validation-utils';

const FieldRenderer = memo(({ index, field, readOnly }: { index?: number; field: FieldItem; readOnly: boolean }) => {
  const [value, setValue] = useState<any>(
    field.type === 'checkbox' ? false : '',
  );
  const [error, setError] = useState<string | null>(null);

  const handleChange = (val: any) => {
    setValue(val);
    const validationError = validateField(field, val);
    setError(validationError);
  };

  const showReason = shouldShowReason(field, value);

  const renderInput = () => {
    if (readOnly) {
      return <div className="p-2 border rounded bg-muted/20 text-muted-foreground text-sm italic">Preview Mode</div>;
    }

    switch (field.type) {
      case 'text':
        return <Input placeholder="Enter text..." onChange={(e) => handleChange(e.target.value)} />;
      case 'textarea':
        return <Textarea placeholder="Enter detailed text..." onChange={(e) => handleChange(e.target.value)} />;
      case 'url':
        return (
          <Input
            type="url"
            placeholder="https://example.com"
            onChange={(e) => handleChange(e.target.value)}
            className={error ? 'border-destructive' : ''}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            placeholder="0"
            onChange={(e) => handleChange(e.target.value === '' ? '' : Number.parseFloat(e.target.value))}
            className={error ? 'border-destructive' : ''}
          />
        );
      case 'checkbox':
        return (
          <div className="flex items-start gap-2">
            <Checkbox
              id={field.id}
              checked={value}
              onCheckedChange={(checked) => handleChange(checked)}
              className="mt-1"
            />
            <Label htmlFor={field.id} className="font-normal cursor-pointer leading-normal">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        );
      case 'date':
        return (
          <div className="flex gap-2">
            <DatePicker value={value} onChange={handleChange} className="flex-1" />
            {!field.required && value && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleChange('')}
                title="Clear date"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      case 'datetime':
        return (
          <div className="flex gap-2">
            <DateTimePicker value={value} onChange={handleChange} className="flex-1" />
            {!field.required && value && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleChange('')}
                title="Clear date time"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      case 'select':
        return (
          <Select onValueChange={handleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.filter((opt) => opt.value).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label || opt.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'multiselect':
        return <MultiSelect options={field.options || []} value={value} onChange={handleChange} />;
      case 'file':
        return (
          <div className="space-y-3">
            {!value
              ? (
                  <div className="space-y-2">
                    <div
                      className="border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 text-muted-foreground"
                      onClick={() => document.getElementById(`file-${field.id}`)?.click()}
                    >
                      <Upload className="h-8 w-8 mb-2" />
                      <p className="text-sm font-medium">Click to upload file</p>
                      {field.validation?.accept && (
                        <p className="text-xs text-muted-foreground/70">
                          {field.validation.accept.split(',').join(', ')}
                        </p>
                      )}
                    </div>
                    <Input
                      id={`file-${field.id}`}
                      type="file"
                      className="hidden"
                      accept={field.validation?.accept}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleChange(file);
                        }
                        // If file is null (cancel), do nothing to persist
                        // But here value is null anyway, so it doesn't matter much.
                      }}
                    />
                  </div>
                )
              : (
                  <div className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          {value.type.startsWith('image/')
                            ? (
                                <img
                                  src={URL.createObjectURL(value)}
                                  alt="Preview"
                                  className="h-full w-full object-cover rounded"
                                />
                              )
                            : <FileIcon className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{value.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(value.size / 1024).toFixed(1)}
                            {' '}
                            KB
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {value.type.startsWith('image/') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(URL.createObjectURL(value), '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive/90"
                          onClick={() => handleChange(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {value.type.startsWith('image/') && (
                      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                        <img
                          src={URL.createObjectURL(value)}
                          alt="Large preview"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}

                    <div className="pt-2 border-t flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => document.getElementById(`file-replace-${field.id}`)?.click()}
                      >
                        Replace
                      </Button>
                      <Input
                        id={`file-replace-${field.id}`}
                        type="file"
                        className="hidden"
                        accept={field.validation?.accept}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleChange(file);
                          }
                          // If cancelled/empty, do nothing to current value -> Persistence!
                        }}
                      />
                    </div>
                  </div>
                )}
          </div>
        );
      default:
        return <div className="text-red-500 text-sm">Unknown field type</div>;
    }
  };

  if (field.type === 'checkbox') {
    return (
      <div className="flex gap-4 p-4 border rounded-lg bg-card">
        {index !== undefined && (
          <span className="text-base font-medium text-muted-foreground shrink-0 select-none w-6 text-center pt-0.5">
            {index + 1}
            .
          </span>
        )}
        <div className="flex-1 space-y-3 min-w-0">
          <div className="space-y-1">
            {renderInput()}
            {field.description && (
              <p className="text-[0.8rem] text-muted-foreground pl-6">
                {field.description}
              </p>
            )}
          </div>
          {showReason && (
            <div className="ml-6 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label className="text-sm text-amber-600 dark:text-amber-500">Explanation Required</Label>
              <Textarea placeholder="Please provide a reason..." className="min-h-20 border-amber-200 focus-visible:ring-amber-500" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-4 border rounded-lg bg-card">
      {index !== undefined && (
        <span className="text-base font-medium text-muted-foreground shrink-0 select-none w-6 text-center pt-0.5">
          {index + 1}
          .
        </span>
      )}
      <div className="flex-1 space-y-3 min-w-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
          {field.description && <p className="text-sm text-muted-foreground">{field.description}</p>}
          {renderInput()}
          {showReason && (
            <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label className="text-sm text-amber-600 dark:text-amber-500">Explanation Required</Label>
              <Textarea placeholder="Please provide a reason..." className="min-h-20 border-amber-200 focus-visible:ring-amber-500" />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
});
FieldRenderer.displayName = 'FieldRenderer';

type TaskFormRendererProps = {
  template: TemplateSchemaType;
  readOnly?: boolean;
};

export const TaskFormRenderer = memo(({ template, readOnly = false }: TaskFormRendererProps) => {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {template.name || 'Untitled Template'}
        </h1>
        {template.description && (
          <p className="text-muted-foreground">{template.description}</p>
        )}
      </div>

      <div className="space-y-6">
        {template.items.length === 0
          ? (
              <div className="text-center py-12 text-muted-foreground">
                Fields will appear here as you add them.
              </div>
            )
          : (
              template.items.map((field, index) => (
                <FieldRenderer index={index} key={field.id} field={field} readOnly={readOnly} />
              ))
            )}
      </div>

      {template.items.length > 0 && !readOnly && (
        <div className="pt-6 border-t">
          <Button className="w-full sm:w-auto">Submit Task</Button>
        </div>
      )}
    </div>
  );
});
TaskFormRenderer.displayName = 'TaskFormRenderer';
