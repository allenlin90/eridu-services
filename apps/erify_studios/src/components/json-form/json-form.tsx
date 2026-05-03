import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { getFieldContentKey } from '@eridu/api-types/task-management';
import {
  FILE_UPLOAD_USE_CASE,
  FILE_UPLOAD_USE_CASE_RULES,
  getImageCompressionTargetBytes,
} from '@eridu/api-types/uploads';
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
  Spinner,
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
  activeGroup?: string;
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
  validateBeforeSubmit: () => Promise<void>;
  flushPendingFileUploads: () => Promise<Record<string, unknown>>;
  hasPendingFileUploads: () => boolean;
  hasBlockingFileIssues: () => boolean;
  clearUploadedFileCache: () => void;
};

type PendingUpload = {
  file: File;
  previewUrl: string | null;
  error: string | null;
  isPreparing: boolean;
};

type UploadedFileCacheEntry = {
  fingerprint: string;
  fileUrl: string;
  uploadTaskId: string;
};

const DEFAULT_VALUES: Record<string, unknown> = {};
const SCREENSHOT_MAX_BYTES = getImageCompressionTargetBytes(Number.POSITIVE_INFINITY);
const SCREENSHOT_COMPRESSION_MAX_LONG_EDGES = [1440, 1280, 1080, 960] as const;
const MATERIAL_ASSET_MAX_BYTES = FILE_UPLOAD_USE_CASE_RULES[FILE_UPLOAD_USE_CASE.MATERIAL_ASSET].max_file_size_bytes;
const MATERIAL_ASSET_ALLOWED_MIME_TYPES = new Set(
  FILE_UPLOAD_USE_CASE_RULES[FILE_UPLOAD_USE_CASE.MATERIAL_ASSET].allowed_mime_types,
);

function isSupportedUploadMimeType(value: string): boolean {
  return MATERIAL_ASSET_ALLOWED_MIME_TYPES.has(value);
}

function isLikelyImageUrl(url: string): boolean {
  return /\.(?:png|jpe?g|webp|gif|bmp|svg)(?:\?.*)?$/i.test(url);
}

function shouldAttemptImagePreview(item: UiSchema['items'][0], currentUrl: string): boolean {
  if (!currentUrl) {
    return false;
  }
  if (isLikelyImageUrl(currentUrl)) {
    return true;
  }
  return item.validation?.accept?.includes('image/') ?? false;
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
    return getImageCompressionTargetBytes(fieldMaxBytes);
  }
  return fieldMaxBytes;
}

function getFileTooLargeMessage(label: string, maxBytes: number): string {
  return `File for '${label}' must be <= ${Math.round(maxBytes / 1024)} KB`;
}

function getFieldMaxHint(item: UiSchema['items'][0], pendingUpload?: PendingUpload): string {
  const fieldMax = item.validation?.max_size ?? MATERIAL_ASSET_MAX_BYTES;
  if (pendingUpload?.file.type.startsWith('image/')) {
    return formatFileSize(getImageCompressionTargetBytes(fieldMax));
  }

  // Image compression is driven by the actual file MIME type (file.type), not the template's
  // accept field. If the field has no accept restriction, image files could be uploaded and would
  // be compressed. Show the image cap hint whenever images are possible for this field.
  const accept = item.validation?.accept;
  const couldReceiveImages = !accept || accept.includes('image/');
  if (couldReceiveImages) {
    return `${formatFileSize(fieldMax)} (images capped at ${formatFileSize(getImageCompressionTargetBytes(fieldMax))})`;
  }
  return formatFileSize(fieldMax);
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'Unknown size';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileFingerprint(file: File): string {
  return [file.name, file.size, file.type, file.lastModified].join(':');
}

export const JsonForm = function JsonForm({
  ref,
  schema,
  values = DEFAULT_VALUES,
  onChange,
  onSubmit,
  readOnly = false,
  activeGroup,
  uploadTaskId,
  onUploadStateChange,
}: JsonFormProps & { ref?: React.RefObject<JsonFormHandle | null> }) {
  const zodSchema = zodSchemaBuilder.buildTaskContentSchema(schema);
  const [uploadingByKey, setUploadingByKey] = useState<Record<string, boolean>>({});
  const [pendingFilesByKey, setPendingFilesByKey] = useState<Record<string, PendingUpload>>({});
  const pendingFilesRef = useRef<Record<string, PendingUpload>>({});
  const uploadedFileCacheRef = useRef<Record<string, UploadedFileCacheEntry>>({});

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(zodSchema),
    defaultValues: values,
    mode: 'onChange',
  });

  const itemsByKey = useMemo(() => new Map(schema.items.map((item) => [getFieldContentKey(schema, item), item])), [schema]);

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
    // Reusing cached URLs across task contexts can attach assets to the wrong task.
    uploadedFileCacheRef.current = {};
  }, [uploadTaskId]);

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

  const clearPendingUpload = useCallback((fieldKey: string) => {
    setPendingFilesByKey((prev) => {
      const next = { ...prev };
      const removed = next[fieldKey];
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      delete next[fieldKey];
      return next;
    });
  }, []);

  const validateBeforeSubmitInternal = useCallback(async () => {
    const currentValues = form.getValues();

    // Only exempt file-type fields that have a pending upload — other field types are always blocking.
    const pendingFileKeys = new Set(
      Object.keys(pendingFilesByKey).filter((k) => itemsByKey.get(k)?.type === 'file'),
    );

    const validation = zodSchema.safeParse(currentValues);

    // Filter validation errors: issues on pending file fields are satisfied by the upload
    // step (flushPendingFileUploads), not by a pre-filled URL. z.url() rejects empty
    // values, so we must exclude those fields from the blocking check entirely.
    const blockingIssues = validation.success
      ? []
      : validation.error.issues.filter(
          (issue) => !pendingFileKeys.has(String(issue.path[0] ?? '')),
        );

    // Scope form.trigger() to non-pending-file fields only. Triggering pending file fields
    // would set URL errors on them (empty value fails z.url()) and incorrectly block submit.
    const nonPendingKeys = [...itemsByKey.keys()].filter((k) => !pendingFileKeys.has(k));
    if (nonPendingKeys.length > 0) {
      await form.trigger(nonPendingKeys);
    }

    if (blockingIssues.length > 0) {
      const firstIssue = blockingIssues[0]?.message;
      throw new Error(firstIssue ?? 'Please complete required fields before submitting');
    }

    // Clear any stale RHF errors on pending file fields so they don't show as invalid.
    if (pendingFileKeys.size > 0) {
      form.clearErrors([...pendingFileKeys]);
    }
  }, [form, itemsByKey, pendingFilesByKey, zodSchema]);

  const flushPendingFileUploadsInternal = useCallback(async () => {
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

      const uploadFile = upload.file;
      const fingerprint = getFileFingerprint(uploadFile);
      const cached = uploadedFileCacheRef.current[fieldKey];

      // Flow step 1: if this exact file was already uploaded for this field, reuse the URL.
      if (cached && cached.fingerprint === fingerprint && cached.uploadTaskId === uploadTaskId) {
        form.setValue(fieldKey, cached.fileUrl, { shouldDirty: true, shouldValidate: true });
        clearPendingUpload(fieldKey);
        continue;
      }

      // Flow step 2: enforce file policy before requesting presign/upload.
      if (!isSupportedUploadMimeType(uploadFile.type)) {
        throw new Error(`Unsupported file type: ${uploadFile.type || 'unknown'}`);
      }
      const accept = item.validation?.accept;
      if (!matchesAcceptRule(uploadFile.type, uploadFile.name, accept)) {
        throw new Error(`File for '${item.label}' does not match allowed types`);
      }

      const maxBytesForField = getFieldMaxBytes(item, uploadFile);
      if (uploadFile.size > maxBytesForField) {
        throw new Error(getFileTooLargeMessage(item.label, maxBytesForField));
      }

      // Flow step 3: presign -> direct upload to storage -> write final URL into form state.
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
        uploadedFileCacheRef.current[fieldKey] = {
          fingerprint,
          fileUrl: presigned.file_url,
          uploadTaskId,
        };
        clearPendingUpload(fieldKey);
      } finally {
        setUploadingByKey((prev) => ({ ...prev, [fieldKey]: false }));
      }
    }

    return form.getValues();
  }, [clearPendingUpload, form, itemsByKey, pendingFilesByKey, uploadTaskId]);

  useImperativeHandle(ref, () => ({
    async validateBeforeSubmit() {
      // Submission guard: treat pending file fields as satisfiable while still enforcing all other fields.
      await validateBeforeSubmitInternal();
    },
    async flushPendingFileUploads() {
      return flushPendingFileUploadsInternal();
    },
    hasPendingFileUploads() {
      return Object.keys(pendingFilesByKey).length > 0;
    },
    hasBlockingFileIssues() {
      return Object.values(pendingFilesByKey).some((upload) => upload.isPreparing || !!upload.error);
    },
    clearUploadedFileCache() {
      uploadedFileCacheRef.current = {};
    },
  }), [flushPendingFileUploadsInternal, pendingFilesByKey, validateBeforeSubmitInternal]);

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
        {schema.items
          .filter((item) => !activeGroup || item.group === activeGroup)
          .map((item) => {
            const contentKey = getFieldContentKey(schema, item);
            return (
              <FormField
                key={contentKey}
                control={form.control}
                name={contentKey}
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
                                isUploading={uploadingByKey[contentKey] ?? false}
                                pendingUpload={pendingFilesByKey[contentKey]}
                                onClearPendingUpload={() => {
                                  clearPendingUpload(contentKey);
                                  delete uploadedFileCacheRef.current[contentKey];
                                }}
                                onClearCurrentUpload={() => {
                                  field.onChange('');
                                  delete uploadedFileCacheRef.current[contentKey];
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
                                  delete uploadedFileCacheRef.current[contentKey];
                                  setPendingFilesByKey((prev) => {
                                    const previous = prev[contentKey];
                                    if (previous?.previewUrl) {
                                      URL.revokeObjectURL(previous.previewUrl);
                                    }
                                    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
                                    return {
                                      ...prev,
                                      [contentKey]: {
                                        file,
                                        previewUrl,
                                        error: null,
                                        isPreparing: file.type.startsWith('image/'),
                                      },
                                    };
                                  });

                                  const setFileError = (error: string | null) => {
                                    setPendingFilesByKey((prev) => {
                                      const current = prev[contentKey];
                                      if (!current || current.file !== file) {
                                        return prev;
                                      }
                                      return {
                                        ...prev,
                                        [contentKey]: {
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
                                        maxLongEdges: maxBytesForField <= SCREENSHOT_MAX_BYTES
                                          ? SCREENSHOT_COMPRESSION_MAX_LONG_EDGES
                                          : undefined,
                                        preferWorker: true,
                                      });
                                      const preparedFile = prepared.file;

                                      setPendingFilesByKey((prev) => {
                                        const current = prev[contentKey];
                                        if (!current || current.file !== file) {
                                          return prev;
                                        }

                                        let error: string | null = null;
                                        if (!matchesAcceptRule(preparedFile.type, preparedFile.name, item.validation?.accept)) {
                                          error = `Compressed file for '${item.label}' does not match allowed types`;
                                        } else if (preparedFile.size > maxBytesForField) {
                                          const limitKb = Math.round(maxBytesForField / 1024);
                                          const achievedKb = Math.round(preparedFile.size / 1024);
                                          error = prepared.wasCompressed
                                            ? `Could not compress '${item.label}' below ${limitKb} KB (best: ${achievedKb} KB)`
                                            : getFileTooLargeMessage(item.label, maxBytesForField);
                                        }

                                        if (error) {
                                          toast.error(error);
                                        }

                                        return {
                                          ...prev,
                                          [contentKey]: {
                                            ...current,
                                            file: preparedFile,
                                            error,
                                            isPreparing: false,
                                          },
                                        };
                                      });

                                      if (prepared.metTarget && prepared.wasCompressed && preparedFile.size < file.size) {
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
            );
          })}
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
  const shouldPreviewCurrentImage = shouldAttemptImagePreview(item, currentUrl);
  const [brokenPreviewUrl, setBrokenPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBusy = isUploading || pendingUpload?.isPreparing;
  const isCurrentPreviewBroken = !!currentUrl && brokenPreviewUrl === currentUrl;

  if (readOnly) {
    return currentUrl
      ? (
          <div className="space-y-2">
            {shouldPreviewCurrentImage && !isCurrentPreviewBroken && (
              <img
                src={currentUrl}
                alt={item.label}
                className="max-h-48 w-auto rounded-md border object-contain"
                onLoad={() => setBrokenPreviewUrl(null)}
                onError={() => setBrokenPreviewUrl(currentUrl)}
              />
            )}
            {shouldPreviewCurrentImage && isCurrentPreviewBroken && (
              <p className="text-xs text-amber-700">
                Image preview unavailable for this link.
              </p>
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
            Size:
            {' '}
            {formatFileSize(pendingUpload.file.size)}
          </p>
          <p className="text-xs text-muted-foreground">
            Max size:
            {' '}
            {getFieldMaxHint(item, pendingUpload)}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {pendingUpload.isPreparing && <Spinner className="size-3" />}
            {pendingUpload.isPreparing
              ? (pendingUpload.file.type.startsWith('image/')
                  ? 'Compressing image...'
                  : 'Preparing file...')
              : 'Will upload when you submit.'}
          </p>
          {pendingUpload.error && (
            <p className="text-xs text-red-600">{pendingUpload.error}</p>
          )}
        </div>
      )}

      {currentUrl && (
        <div className="space-y-2 rounded-md border p-2">
          {shouldPreviewCurrentImage && !isCurrentPreviewBroken && (
            <img
              src={currentUrl}
              alt={item.label}
              className="max-h-48 w-auto rounded-md border object-contain"
              onLoad={() => setBrokenPreviewUrl(null)}
              onError={() => setBrokenPreviewUrl(currentUrl)}
            />
          )}
          {shouldPreviewCurrentImage && isCurrentPreviewBroken && (
            <p className="text-xs text-amber-700">
              Image preview unavailable. File may be missing or link is broken. You can replace and submit again.
            </p>
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
      {!pendingUpload && (
        <p className="text-xs text-muted-foreground">
          Max size:
          {' '}
          {getFieldMaxHint(item)}
        </p>
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
