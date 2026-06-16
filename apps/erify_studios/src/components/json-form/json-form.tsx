import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  getFieldContentKey,
  getTaskContentExtraKey,
  getTaskContentReasonKey,
  shouldShowReasonField,
} from '@eridu/api-types/task-management';
import { FILE_UPLOAD_USE_CASE } from '@eridu/api-types/uploads';
import { matchesAcceptRule, prepareImageForUpload } from '@eridu/browser-upload';
import {
  Checkbox,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Textarea,
} from '@eridu/ui';

import { FieldRenderer } from './field-renderer';
import type {
  JsonFormHandle,
  JsonFormProps,
  PendingUpload,
  UploadedFileCacheEntry,
} from './json-form.types';
import {
  formatExtraItems,
  getFieldMaxBytes,
  getFileFingerprint,
  getFileTooLargeMessage,
  isSupportedUploadMimeType,
  releasePendingUploads,
  SCREENSHOT_COMPRESSION_MAX_LONG_EDGES,
  SCREENSHOT_MAX_BYTES,
} from './json-form.utils';

import { requestPresignedUpload, uploadFileToPresignedUrl } from '@/features/tasks/api/presign-upload';
import { zodSchemaBuilder } from '@/lib/zod-schema-builder';

export type { JsonFormHandle, JsonFormUploadState } from './json-form.types';

const DEFAULT_VALUES: Record<string, unknown> = {};

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
      const subscription = form.watch((value, { name }) => {
        if (name) {
          const changedItem = itemsByKey.get(name);
          if (changedItem) {
            const nextReasonKey = getTaskContentReasonKey(name);
            const nextValue = value[name];
            const reasonValue = value[nextReasonKey];
            if (
              !shouldShowReasonField(changedItem, nextValue)
              && typeof reasonValue === 'string'
              && reasonValue.length > 0
            ) {
              form.setValue(nextReasonKey, '', { shouldDirty: true, shouldValidate: true });
              return;
            }
          }
        }
        onChange(value as Record<string, unknown>);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, itemsByKey, onChange]);

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
            const reasonKey = getTaskContentReasonKey(contentKey);
            const extraKey = getTaskContentExtraKey(contentKey);
            const fieldValue = form.watch(contentKey);
            const reasonValue = form.watch(reasonKey);
            const extraItems = formatExtraItems(form.watch(extraKey));
            const showReason = shouldShowReasonField(item, fieldValue)
              || (typeof reasonValue === 'string' && reasonValue.length > 0);
            const isStaleBinding = (item as { binding_stale?: boolean }).binding_stale === true;
            const effectiveReadOnly = readOnly || isStaleBinding;

            return (
              <div
                key={contentKey}
                className={isStaleBinding ? 'space-y-3 opacity-50' : 'space-y-3'}
                data-binding-stale={isStaleBinding ? 'true' : undefined}
              >
                {isStaleBinding && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Target no longer assigned — value preserved for review, not extracted.
                  </div>
                )}
                <FormField
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
                                  disabled={effectiveReadOnly}
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
                                  readOnly={effectiveReadOnly}
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
                {showReason && (
                  <FormField
                    control={form.control}
                    name={reasonKey}
                    render={({ field }) => (
                      <FormItem className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
                        <FormLabel>
                          Explanation for
                          {' '}
                          {item.label}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={(field.value as string) ?? ''}
                            disabled={effectiveReadOnly}
                            className="min-h-20 bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {extraItems.length > 0 && (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="text-sm font-medium">
                      Extra for
                      {' '}
                      {item.label}
                    </div>
                    <div className="mt-2 space-y-1">
                      {extraItems.map((extraItem) => (
                        <div key={extraItem} className="text-sm text-muted-foreground">
                          {extraItem}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </form>
    </Form>
  );
};
