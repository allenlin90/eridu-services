import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { FILE_UPLOAD_USE_CASE } from '@eridu/api-types/uploads';
import { matchesAcceptRule, prepareImageForUpload } from '@eridu/browser-upload';
import {
  Button,
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

import { requestPresignedUpload, uploadFileToPresignedUrl } from '@/features/tasks/api/presign-upload';
import type { UiSchema } from '@/lib/zod-schema-builder';
import { zodSchemaBuilder } from '@/lib/zod-schema-builder';

type JsonFormProps = {
  schema: UiSchema;
  values?: Record<string, unknown>;
  onChange?: (values: Record<string, unknown>) => void;
  onSubmit?: (values: Record<string, unknown>) => void;
  readOnly?: boolean;
  uploadTaskId?: string;
  onUploadStateChange?: (state: JsonFormUploadState) => void;
};

export type JsonFormUploadState = {
  hasPendingUploads: boolean;
  hasBlockingIssues: boolean;
  isPreparingUploads: boolean;
  blockingMessages: string[];
};

export type JsonFormHandle = {
  flushPendingFileUploads: () => Promise<Record<string, unknown>>;
  hasPendingFileUploads: () => boolean;
  hasBlockingFileIssues: () => boolean;
};

type PendingUpload = {
  file: File;
  previewUrl: string | null;
  error: string | null;
  isPreparing: boolean;
};

const DEFAULT_VALUES: Record<string, unknown> = {};
const SUPPORTED_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'] as const;
const SCREENSHOT_MAX_BYTES = 200 * 1024;

function isSupportedUploadMimeType(value: string): value is (typeof SUPPORTED_UPLOAD_MIME_TYPES)[number] {
  return SUPPORTED_UPLOAD_MIME_TYPES.includes(value as (typeof SUPPORTED_UPLOAD_MIME_TYPES)[number]);
}

function isLikelyImageUrl(url: string): boolean {
  return /\.(?:png|jpe?g|webp|gif|bmp|svg)(?:\?.*)?$/i.test(url);
}

function releasePendingUploads(map: Record<string, PendingUpload>): void {
  for (const upload of Object.values(map)) {
    if (upload.previewUrl) {
      URL.revokeObjectURL(upload.previewUrl);
    }
  }
}

function getFieldMaxBytes(item: UiSchema['items'][0], file: File): number {
  const fieldMaxBytes = item.validation?.max_size ?? Number.POSITIVE_INFINITY;
  if (file.type.startsWith('image/')) {
    return Math.min(fieldMaxBytes, SCREENSHOT_MAX_BYTES);
  }
  return fieldMaxBytes;
}

function getFileTooLargeMessage(label: string, maxBytes: number): string {
  return `File for '${label}' must be <= ${Math.round(maxBytes / 1024)} KB`;
}

export const JsonForm = function JsonForm({
  ref,
  schema,
  values = DEFAULT_VALUES,
  onChange,
  onSubmit,
  readOnly = false,
  uploadTaskId,
  onUploadStateChange,
}: JsonFormProps & { ref?: React.RefObject<JsonFormHandle | null> }) {
  const zodSchema = zodSchemaBuilder.buildTaskContentSchema(schema);
  const [uploadingByKey, setUploadingByKey] = useState<Record<string, boolean>>({});
  const [pendingFilesByKey, setPendingFilesByKey] = useState<Record<string, PendingUpload>>({});
  const pendingFilesRef = useRef<Record<string, PendingUpload>>({});

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(zodSchema),
    defaultValues: values,
    mode: 'onChange',
  });

  const itemsByKey = useMemo(() => new Map(schema.items.map((item) => [item.key, item])), [schema.items]);

  useEffect(() => {
    if (values) {
      form.reset(values);
      setPendingFilesByKey((prev) => {
        releasePendingUploads(prev);
        return {};
      });
    }
  }, [values, form]);

  useEffect(() => {
    pendingFilesRef.current = pendingFilesByKey;
  }, [pendingFilesByKey]);

  useEffect(() => {
    return () => {
      releasePendingUploads(pendingFilesRef.current);
    };
  }, []);

  useEffect(() => {
    if (onChange) {
      const subscription = form.watch((value) => {
        onChange(value as Record<string, unknown>);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, onChange]);

  useEffect(() => {
    if (!onUploadStateChange) {
      return;
    }

    const pendingUploads = Object.values(pendingFilesByKey);
    const isPreparingUploads = pendingUploads.some((upload) => upload.isPreparing);
    const blockingMessages = pendingUploads
      .map((upload) => upload.error)
      .filter((error): error is string => Boolean(error));

    if (isPreparingUploads) {
      blockingMessages.unshift('File preparation is still in progress');
    }

    onUploadStateChange({
      hasPendingUploads: pendingUploads.length > 0,
      hasBlockingIssues: blockingMessages.length > 0,
      isPreparingUploads,
      blockingMessages,
    });
  }, [onUploadStateChange, pendingFilesByKey]);

  useImperativeHandle(ref, () => ({
    async flushPendingFileUploads() {
      if (Object.keys(pendingFilesByKey).length === 0) {
        return form.getValues();
      }

      if (!uploadTaskId) {
        throw new Error('Task context is required for file upload');
      }

      if (Object.values(pendingFilesByKey).some((upload) => upload.isPreparing)) {
        throw new Error('Please wait until file preparation is finished');
      }

      const blockingError = Object.values(pendingFilesByKey).find((upload) => upload.error)?.error;
      if (blockingError) {
        throw new Error(blockingError);
      }

      const entries = Object.entries(pendingFilesByKey);
      for (const [fieldKey, upload] of entries) {
        const item = itemsByKey.get(fieldKey);
        if (!item || item.type !== 'file') {
          continue;
        }

        const file = upload.file;
        if (!isSupportedUploadMimeType(file.type)) {
          throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
        }
        const accept = item.validation?.accept;
        if (!matchesAcceptRule(file.type, file.name, accept)) {
          throw new Error(`File for '${item.label}' does not match allowed types`);
        }

        const maxBytesForField = getFieldMaxBytes(item, file);

        const prepared = file.type.startsWith('image/')
          ? await prepareImageForUpload(file, {
            targetMaxBytes: maxBytesForField,
            accept,
            preferWorker: true,
          })
          : { file, wasCompressed: false, usedWorker: false };
        const uploadFile = prepared.file;

        if (!matchesAcceptRule(uploadFile.type, uploadFile.name, accept)) {
          throw new Error(`Compressed file for '${item.label}' does not match allowed types`);
        }
        if (uploadFile.size > maxBytesForField) {
          throw new Error(getFileTooLargeMessage(item.label, maxBytesForField));
        }

        setUploadingByKey((prev) => ({ ...prev, [fieldKey]: true }));
        try {
          const presigned = await requestPresignedUpload({
            use_case: FILE_UPLOAD_USE_CASE.MATERIAL_ASSET,
            mime_type: uploadFile.type,
            file_size: uploadFile.size,
            file_name: uploadFile.name,
            task_id: uploadTaskId,
            field_key: fieldKey,
          });

          await uploadFileToPresignedUrl(presigned, uploadFile);
          form.setValue(fieldKey, presigned.file_url, { shouldDirty: true, shouldValidate: true });
          if (prepared.wasCompressed) {
            const method = prepared.usedWorker ? ' in background' : '';
            toast.success(`Compressed '${item.label}' to ${Math.round(uploadFile.size / 1024)} KB${method}`);
          }
          setPendingFilesByKey((prev) => {
            const next = { ...prev };
            const removed = next[fieldKey];
            if (removed?.previewUrl) {
              URL.revokeObjectURL(removed.previewUrl);
            }
            delete next[fieldKey];
            return next;
          });
        } finally {
          setUploadingByKey((prev) => ({ ...prev, [fieldKey]: false }));
        }
      }

      return form.getValues();
    },
    hasPendingFileUploads() {
      return Object.keys(pendingFilesByKey).length > 0;
    },
    hasBlockingFileIssues() {
      return Object.values(pendingFilesByKey).some((upload) => upload.isPreparing || !!upload.error);
    },
  }), [form, itemsByKey, pendingFilesByKey, uploadTaskId]);

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
                            isUploading={uploadingByKey[item.key] ?? false}
                            pendingUpload={pendingFilesByKey[item.key]}
                            onClearPendingUpload={() => {
                              setPendingFilesByKey((prev) => {
                                const next = { ...prev };
                                const removed = next[item.key];
                                if (removed?.previewUrl) {
                                  URL.revokeObjectURL(removed.previewUrl);
                                }
                                delete next[item.key];
                                return next;
                              });
                            }}
                            onClearCurrentUpload={() => {
                              field.onChange('');
                            }}
                            onFileSelect={(file) => {
                              if (!isSupportedUploadMimeType(file.type)) {
                                toast.error(`Unsupported file type: ${file.type || 'unknown'}`);
                                return;
                              }

                              if (!matchesAcceptRule(file.type, file.name, item.validation?.accept)) {
                                toast.error('File does not match allowed types');
                                return;
                              }

                              const maxBytesForField = getFieldMaxBytes(item, file);
                              setPendingFilesByKey((prev) => {
                                const previous = prev[item.key];
                                if (previous?.previewUrl) {
                                  URL.revokeObjectURL(previous.previewUrl);
                                }
                                const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
                                return {
                                  ...prev,
                                  [item.key]: {
                                    file,
                                    previewUrl,
                                    error: null,
                                    isPreparing: file.type.startsWith('image/'),
                                  },
                                };
                              });

                              const setFileError = (error: string | null) => {
                                setPendingFilesByKey((prev) => {
                                  const current = prev[item.key];
                                  if (!current || current.file !== file) {
                                    return prev;
                                  }
                                  return {
                                    ...prev,
                                    [item.key]: {
                                      ...current,
                                      error,
                                      isPreparing: false,
                                    },
                                  };
                                });
                              };

                              if (!file.type.startsWith('image/')) {
                                if (file.size > maxBytesForField) {
                                  const error = getFileTooLargeMessage(item.label, maxBytesForField);
                                  toast.error(error);
                                  setFileError(error);
                                  return;
                                }
                                setFileError(null);
                                return;
                              }

                              void (async () => {
                                try {
                                  const prepared = await prepareImageForUpload(file, {
                                    targetMaxBytes: maxBytesForField,
                                    accept: item.validation?.accept,
                                    preferWorker: true,
                                  });
                                  const preparedFile = prepared.file;

                                  setPendingFilesByKey((prev) => {
                                    const current = prev[item.key];
                                    if (!current || current.file !== file) {
                                      return prev;
                                    }

                                    let error: string | null = null;
                                    if (!matchesAcceptRule(preparedFile.type, preparedFile.name, item.validation?.accept)) {
                                      error = `Compressed file for '${item.label}' does not match allowed types`;
                                    } else if (preparedFile.size > maxBytesForField) {
                                      error = getFileTooLargeMessage(item.label, maxBytesForField);
                                    }

                                    if (error) {
                                      toast.error(error);
                                    }

                                    return {
                                      ...prev,
                                      [item.key]: {
                                        ...current,
                                        file: preparedFile,
                                        error,
                                        isPreparing: false,
                                      },
                                    };
                                  });

                                  if (prepared.wasCompressed && preparedFile.size < file.size) {
                                    const method = prepared.usedWorker ? ' in background' : '';
                                    toast.success(`Compressed '${item.label}' to ${Math.round(preparedFile.size / 1024)} KB${method}`);
                                  }
                                } catch {
                                  setFileError(`Failed to prepare '${item.label}' for upload`);
                                }
                              })();
                            }}
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
};

type FieldRendererProps = {
  item: UiSchema['items'][0];
  field: ControllerRenderProps<FieldValues, string>;
  readOnly?: boolean;
  isUploading?: boolean;
  pendingUpload?: PendingUpload;
  onClearPendingUpload?: () => void;
  onClearCurrentUpload?: () => void;
  onFileSelect?: (file: File) => Promise<void> | void;
};

function FileFieldRenderer({
  item,
  currentUrl,
  readOnly,
  pendingUpload,
  isUploading,
  onClearPendingUpload,
  onClearCurrentUpload,
  onFileSelect,
}: {
  item: UiSchema['items'][0];
  currentUrl: string;
  readOnly?: boolean;
  pendingUpload?: PendingUpload;
  isUploading?: boolean;
  onClearPendingUpload?: () => void;
  onClearCurrentUpload?: () => void;
  onFileSelect?: (file: File) => void;
}) {
  const isCurrentImage = isLikelyImageUrl(currentUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBusy = isUploading || pendingUpload?.isPreparing;

  if (readOnly) {
    return currentUrl
      ? (
          <div className="space-y-2">
            {isCurrentImage && (
              <img
                src={currentUrl}
                alt={item.label}
                className="max-h-48 w-auto rounded-md border object-contain"
              />
            )}
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline break-all"
            >
              {currentUrl}
            </a>
          </div>
        )
      : (
          <p className="text-sm text-muted-foreground italic">No file uploaded</p>
        );
  }

  return (
    <div className="space-y-2">
      {pendingUpload && (
        <div className="space-y-2 rounded-md border p-2">
          {pendingUpload.previewUrl && (
            <img
              src={pendingUpload.previewUrl}
              alt={pendingUpload.file.name}
              className="max-h-48 w-auto rounded-md border object-contain"
            />
          )}
          <p className="text-xs text-muted-foreground">
            Pending upload:
            {' '}
            {pendingUpload.file.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {pendingUpload.isPreparing ? 'Preparing file...' : 'Will upload when you submit.'}
          </p>
          {pendingUpload.error && (
            <p className="text-xs text-red-600">{pendingUpload.error}</p>
          )}
        </div>
      )}

      {currentUrl && (
        <div className="space-y-2 rounded-md border p-2">
          {isCurrentImage && (
            <img
              src={currentUrl}
              alt={item.label}
              className="max-h-48 w-auto rounded-md border object-contain"
            />
          )}
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-sm text-primary hover:underline break-all"
          >
            {currentUrl}
          </a>
        </div>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={item.validation?.accept}
        disabled={isBusy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && onFileSelect) {
            void onFileSelect(file);
          }
          event.target.value = '';
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          {(pendingUpload || currentUrl) ? 'Replace File' : 'Choose File'}
        </Button>

        {pendingUpload && (
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={onClearPendingUpload}
          >
            Remove Pending
          </Button>
        )}

        {!pendingUpload && currentUrl && (
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={onClearCurrentUpload}
          >
            Remove Uploaded
          </Button>
        )}
      </div>
      {isUploading && (
        <p className="text-xs text-muted-foreground">Uploading...</p>
      )}
    </div>
  );
}

function FieldRenderer({
  item,
  field,
  readOnly,
  isUploading = false,
  pendingUpload,
  onClearPendingUpload,
  onClearCurrentUpload,
  onFileSelect,
}: FieldRendererProps) {
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
    case 'file': {
      const currentUrl = typeof field.value === 'string' ? field.value : '';
      return (
        <FileFieldRenderer
          item={item}
          currentUrl={currentUrl}
          readOnly={readOnly}
          pendingUpload={pendingUpload}
          isUploading={isUploading}
          onClearPendingUpload={onClearPendingUpload}
          onClearCurrentUpload={onClearCurrentUpload}
          onFileSelect={onFileSelect}
        />
      );
    }
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
